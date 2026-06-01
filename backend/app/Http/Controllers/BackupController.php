<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class BackupController extends Controller
{
    private function checkAdmin(Request $request)
    {
        if (!$request->user() || !$request->user()->hasRole('Admin')) {
            abort(403, 'Accès non autorisé. Réservé aux administrateurs.');
        }
    }

    private function getBackupDirectory()
    {
        $path = storage_path('app/backups');
        File::ensureDirectoryExists($path);
        return $path;
    }

    public function index(Request $request)
    {
        $this->checkAdmin($request);
        $directory = $this->getBackupDirectory();
        
        $files = File::files($directory);
        $backups = [];

        foreach ($files as $file) {
            $ext = strtolower($file->getExtension());
            if ($ext === 'sqlite' || $ext === 'sql') {
                $backups[] = [
                    'filename'   => $file->getFilename(),
                    'size'       => $this->formatBytes($file->getSize()),
                    'size_bytes' => $file->getSize(),
                    'created_at' => date('Y-m-d H:i:s', $file->getMTime()),
                ];
            }
        }

        // Sort backups by creation time descending (newest first)
        usort($backups, function ($a, $b) {
            return strcmp($b['created_at'], $a['created_at']);
        });

        return response()->json($backups);
    }

    public function create(Request $request)
    {
        $this->checkAdmin($request);
        
        $defaultConnection = config('database.default');
        $directory = $this->getBackupDirectory();
        
        if ($defaultConnection === 'sqlite') {
            $dbPath = config('database.connections.sqlite.database');
            
            if (!File::exists($dbPath)) {
                return response()->json(['message' => 'Le fichier de base de données source est introuvable.'], 404);
            }

            $filename = 'backup_' . date('Ymd_His') . '.sqlite';
            $targetPath = $directory . DIRECTORY_SEPARATOR . $filename;

            try {
                DB::disconnect();
                if (copy($dbPath, $targetPath)) {
                    return response()->json([
                        'message'  => 'Sauvegarde créée avec succès (SQLite).',
                        'backup' => [
                            'filename'   => $filename,
                            'size'       => $this->formatBytes(filesize($targetPath)),
                            'created_at' => date('Y-m-d H:i:s', filemtime($targetPath)),
                        ]
                    ], 201);
                } else {
                    return response()->json(['message' => 'Impossible de copier le fichier de base de données.'], 500);
                }
            } catch (\Exception $e) {
                Log::error('Erreur lors de la création de la sauvegarde : ' . $e->getMessage());
                return response()->json(['message' => 'Erreur lors de la création de la sauvegarde : ' . $e->getMessage()], 500);
            }
        } elseif ($defaultConnection === 'mysql') {
            $filename = 'backup_' . date('Ymd_His') . '.sql';
            $targetPath = $directory . DIRECTORY_SEPARATOR . $filename;

            try {
                $this->backupMysql($targetPath);
                return response()->json([
                    'message'  => 'Sauvegarde créée avec succès (MySQL).',
                    'backup' => [
                        'filename'   => $filename,
                        'size'       => $this->formatBytes(filesize($targetPath)),
                        'created_at' => date('Y-m-d H:i:s', filemtime($targetPath)),
                    ]
                ], 201);
            } catch (\Exception $e) {
                Log::error('Erreur lors de la création de la sauvegarde MySQL : ' . $e->getMessage());
                return response()->json(['message' => 'Erreur lors de la création de la sauvegarde : ' . $e->getMessage()], 500);
            }
        } else {
            return response()->json(['message' => 'Pilote de base de données non pris en charge pour les sauvegardes.'], 400);
        }
    }

    public function download(Request $request, $filename)
    {
        $this->checkAdmin($request);
        
        $filename = basename($filename); // Prevent directory traversal
        $path = $this->getBackupDirectory() . DIRECTORY_SEPARATOR . $filename;

        if (!File::exists($path)) {
            return response()->json(['message' => 'Le fichier de sauvegarde est introuvable.'], 404);
        }

        return response()->download($path);
    }

    public function restore(Request $request)
    {
        $this->checkAdmin($request);

        $request->validate([
            'filename' => 'required|string',
        ]);

        $filename = basename($request->filename); // Prevent directory traversal
        $backupPath = $this->getBackupDirectory() . DIRECTORY_SEPARATOR . $filename;
        $defaultConnection = config('database.default');

        if (!File::exists($backupPath)) {
            return response()->json(['message' => 'Le fichier de sauvegarde est introuvable.'], 404);
        }

        try {
            if ($defaultConnection === 'sqlite') {
                $dbPath = config('database.connections.sqlite.database');
                if (!File::exists($dbPath)) {
                    return response()->json(['message' => 'Le fichier de base de données cible est introuvable.'], 404);
                }

                DB::disconnect();
                if (copy($backupPath, $dbPath)) {
                    return response()->json(['message' => 'Base de données SQLite restaurée avec succès.']);
                } else {
                    return response()->json(['message' => 'Impossible de restaurer le fichier de base de données.'], 500);
                }
            } elseif ($defaultConnection === 'mysql') {
                $this->restoreMysql($backupPath);
                return response()->json(['message' => 'Base de données MySQL restaurée avec succès.']);
            } else {
                return response()->json(['message' => 'Pilote de base de données non pris en charge pour la restauration.'], 400);
            }
        } catch (\Exception $e) {
            Log::error('Erreur lors de la restauration de la base de données : ' . $e->getMessage());
            return response()->json(['message' => 'Erreur lors de la restauration : ' . $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, $filename)
    {
        $this->checkAdmin($request);

        $filename = basename($filename); // Prevent directory traversal
        $path = $this->getBackupDirectory() . DIRECTORY_SEPARATOR . $filename;

        if (!File::exists($path)) {
            return response()->json(['message' => 'Le fichier de sauvegarde est introuvable.'], 404);
        }

        try {
            File::delete($path);
            return response()->json(['message' => 'Sauvegarde supprimée avec succès.']);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la suppression de la sauvegarde : ' . $e->getMessage());
            return response()->json(['message' => 'Erreur lors de la suppression de la sauvegarde.'], 500);
        }
    }

    private function backupMysql($targetPath)
    {
        $tables = [];
        $result = DB::select('SHOW TABLES');
        $dbName = config('database.connections.mysql.database');
        $keyName = 'Tables_in_' . $dbName;
        
        foreach ($result as $row) {
            $tables[] = $row->$keyName;
        }
        
        $sql = "-- Application de Gestion d'Inventaire (DIEEPEC FBS) Database Backup\n";
        $sql .= "-- Date: " . date('Y-m-d H:i:s') . "\n\n";
        $sql .= "SET FOREIGN_KEY_CHECKS=0;\n\n";
        
        foreach ($tables as $table) {
            // Get create table statement
            $createTable = DB::select("SHOW CREATE TABLE `{$table}`");
            $createTableKey = 'Create Table';
            $sql .= "DROP TABLE IF EXISTS `{$table}`;\n";
            $sql .= $createTable[0]->$createTableKey . ";\n\n";
            
            // Get table data
            $rows = DB::select("SELECT * FROM `{$table}`");
            if (count($rows) > 0) {
                $sql .= "INSERT INTO `{$table}` VALUES \n";
                $inserts = [];
                foreach ($rows as $row) {
                    $values = [];
                    foreach ((array)$row as $val) {
                        if (is_null($val)) {
                            $values[] = "NULL";
                        } else {
                            $values[] = DB::getPdo()->quote($val);
                        }
                    }
                    $inserts[] = "(" . implode(", ", $values) . ")";
                }
                $sql .= implode(",\n", $inserts) . ";\n\n";
            }
        }
        
        $sql .= "SET FOREIGN_KEY_CHECKS=1;\n";
        
        File::put($targetPath, $sql);
    }

    private function restoreMysql($backupPath)
    {
        $sql = File::get($backupPath);
        DB::unprepared($sql);
    }

    private function formatBytes($bytes, $precision = 2)
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        $bytes /= pow(1024, $pow);
        return round($bytes, $precision) . ' ' . $units[$pow];
    }
}
