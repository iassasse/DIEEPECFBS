<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use App\Models\User;
use App\Models\Category;
use App\Models\Product;
use App\Models\StockMovement;

class RolesAndPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Create permissions
        $permissions = [
            'view products', 'create products', 'edit products', 'delete products',
            'view categories', 'create categories', 'edit categories', 'delete categories',
            'view stock', 'create stock movements', 'edit stock movements',
            'view users', 'create users', 'edit users', 'delete users',
            'view dashboard', 'view reports',
            'view notifications', 'manage notifications',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        // Create roles
        $roleAdmin = Role::firstOrCreate(['name' => 'Admin']);
        $roleGestionnaire = Role::firstOrCreate(['name' => 'Gestionnaire']);
        $roleUtilisateur = Role::firstOrCreate(['name' => 'Utilisateur']);

        // Admin gets all permissions
        $roleAdmin->syncPermissions(Permission::all());

        // Gestionnaire gets product/stock/category management
        $roleGestionnaire->syncPermissions([
            'view products', 'create products', 'edit products',
            'view categories', 'create categories', 'edit categories',
            'view stock', 'create stock movements', 'edit stock movements',
            'view dashboard', 'view reports',
            'view notifications',
        ]);

        // Utilisateur gets view-only
        $roleUtilisateur->syncPermissions([
            'view products', 'view categories', 'view stock', 'view dashboard',
            'view notifications',
        ]);

        // --- Create Users ---
        $admin = User::firstOrCreate(
            ['email' => 'admin@dieepec.com'],
            ['name' => 'Admin DIEEPEC', 'password' => bcrypt('password123')]
        );
        $admin->syncRoles($roleAdmin);

        $manager = User::firstOrCreate(
            ['email' => 'manager@dieepec.com'],
            ['name' => 'Gestionnaire DIEEPEC', 'password' => bcrypt('password123')]
        );
        $manager->syncRoles($roleGestionnaire);

        $user = User::firstOrCreate(
            ['email' => 'user@dieepec.com'],
            ['name' => 'Utilisateur DIEEPEC', 'password' => bcrypt('password123')]
        );
        $user->syncRoles($roleUtilisateur);

        // --- Seed Categories & Products from MODEL INVENTAIRE.xlsx ---
        if (Product::count() === 0) {
            $file = base_path('../MODEL INVENTAIRE.xlsx');
            if (file_exists($file)) {
                $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($file);
                $sheet = $spreadsheet->getSheet(0);
                $data = $sheet->toArray(null, true, true, true);
                
                // Remove headers (row 1)
                array_shift($data);
                
                foreach ($data as $row) {
                    $rowFiltered = array_filter($row, function($val) { return $val !== null && trim((string)$val) !== ''; });
                    if (empty($rowFiltered)) continue;

                    $invNo = trim($row['A'] ?? '');
                    $familleName = trim($row['B'] ?? '');
                    $qty = intval($row['C'] ?? 0);
                    $designation = trim($row['D'] ?? '');
                    $localisation = trim($row['E'] ?? '');
                    $marque = trim($row['F'] ?? '');
                    $serialNo = trim($row['G'] ?? '');
                    $service = trim($row['H'] ?? '');
                    $refAchat = trim($row['I'] ?? '');
                    $prixHT = floatval($row['J'] ?? 0);

                    if (empty($designation)) continue;

                    $category = Category::firstOrCreate(
                        ['name' => $familleName ?: 'Général'],
                        ['description' => 'Famille ' . ($familleName ?: 'Général')]
                    );

                    $product = Product::create([
                        'inventory_number'   => $invNo ?: null,
                        'designation'        => $designation,
                        'category_id'        => $category->id,
                        'quantity'           => $qty,
                        'price'              => $prixHT,
                        'location'           => $localisation,
                        'brand'              => $marque,
                        'serial_number'      => $serialNo,
                        'user_service'       => $service,
                        'purchase_reference' => $refAchat,
                        'alert_threshold'    => 0,
                    ]);

                    if ($qty > 0) {
                        StockMovement::create([
                            'product_id' => $product->id,
                            'user_id'    => $admin->id,
                            'type'       => 'entry',
                            'quantity'   => $qty,
                            'reference'  => 'INIT-' . strtoupper(substr(md5($product->id), 0, 6)),
                            'notes'      => 'Initialisation d\'inventaire à la création',
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    }
                }
            } else {
                $this->command->error("Fichier d'inventaire introuvable à l'adresse: " . $file);
            }
        }

        $this->command->info('✅ Seeding terminé avec succès !');
        $this->command->table(
            ['Compte', 'Email', 'Mot de passe', 'Rôle'],
            [
                ['Admin', 'admin@dieepec.com', 'password123', 'Admin'],
                ['Gestionnaire', 'manager@dieepec.com', 'password123', 'Gestionnaire'],
                ['Utilisateur', 'user@dieepec.com', 'password123', 'Utilisateur'],
            ]
        );
    }
}
