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

        // --- Seed Categories ---
        $categories = [
            ['name' => 'Informatique', 'description' => 'Matériel informatique et accessoires'],
            ['name' => 'Fournitures Bureau', 'description' => 'Papeterie et fournitures de bureau'],
            ['name' => 'Mobilier', 'description' => 'Meubles et équipements'],
            ['name' => 'Électronique', 'description' => 'Appareils électroniques'],
            ['name' => 'Hygiène', 'description' => 'Produits d\'hygiène et nettoyage'],
        ];

        foreach ($categories as $cat) {
            Category::firstOrCreate(['name' => $cat['name']], $cat);
        }

        // --- Seed Products ---
        $catInfo = Category::where('name', 'Informatique')->first();
        $catFournitures = Category::where('name', 'Fournitures Bureau')->first();
        $catMobilier = Category::where('name', 'Mobilier')->first();
        $catElec = Category::where('name', 'Électronique')->first();
        $catHygiene = Category::where('name', 'Hygiène')->first();

        $products = [
            ['name' => 'Ordinateur Portable HP', 'description' => 'HP ProBook 450 G8', 'category_id' => $catInfo->id, 'quantity' => 15, 'price' => 850000, 'barcode' => 'HP-PB450-001', 'supplier' => 'HP Maroc', 'alert_threshold' => 5],
            ['name' => 'Souris Sans Fil', 'description' => 'Logitech MX Master 3', 'category_id' => $catInfo->id, 'quantity' => 8, 'price' => 25000, 'barcode' => 'LOG-MX3-001', 'supplier' => 'Logitech', 'alert_threshold' => 10],
            ['name' => 'Clavier Mécanique', 'description' => 'Clavier gaming RGB', 'category_id' => $catInfo->id, 'quantity' => 3, 'price' => 18000, 'barcode' => 'KB-MECA-001', 'supplier' => 'Corsair', 'alert_threshold' => 5],
            ['name' => 'Ramette Papier A4', 'description' => 'Papier 80g/m², 500 feuilles', 'category_id' => $catFournitures->id, 'quantity' => 120, 'price' => 4500, 'barcode' => 'PAP-A4-001', 'supplier' => 'Paperbox', 'alert_threshold' => 20],
            ['name' => 'Stylos Bille (Boite)', 'description' => 'Lot de 50 stylos bleus', 'category_id' => $catFournitures->id, 'quantity' => 45, 'price' => 2000, 'barcode' => 'STY-BIC-001', 'supplier' => 'BIC', 'alert_threshold' => 10],
            ['name' => 'Classeurs A4', 'description' => 'Classeurs rigides dos 7cm', 'category_id' => $catFournitures->id, 'quantity' => 7, 'price' => 3500, 'barcode' => 'CLA-A4-001', 'supplier' => 'Leitz', 'alert_threshold' => 10],
            ['name' => 'Chaise de Bureau', 'description' => 'Chaise ergonomique réglable', 'category_id' => $catMobilier->id, 'quantity' => 12, 'price' => 120000, 'barcode' => 'CHB-ERG-001', 'supplier' => 'OfficeMax', 'alert_threshold' => 3],
            ['name' => 'Bureau Directeur', 'description' => 'Bureau en L avec rangement', 'category_id' => $catMobilier->id, 'quantity' => 4, 'price' => 280000, 'barcode' => 'BUR-DIR-001', 'supplier' => 'IKEA Pro', 'alert_threshold' => 2],
            ['name' => 'Projecteur Vidéo', 'description' => 'Epson EB-X41 3600 lumens', 'category_id' => $catElec->id, 'quantity' => 2, 'price' => 320000, 'barcode' => 'PRJ-EPS-001', 'supplier' => 'Epson', 'alert_threshold' => 2],
            ['name' => 'Imprimante Laser', 'description' => 'HP LaserJet Pro M404n', 'category_id' => $catElec->id, 'quantity' => 5, 'price' => 195000, 'barcode' => 'IMP-HP-001', 'supplier' => 'HP Maroc', 'alert_threshold' => 2],
            ['name' => 'Gel Hydroalcoolique 1L', 'description' => 'Désinfectant mains 1 litre', 'category_id' => $catHygiene->id, 'quantity' => 60, 'price' => 3500, 'barcode' => 'GEL-HYD-001', 'supplier' => 'Dettol', 'alert_threshold' => 15],
            ['name' => 'Masques Chirurgicaux (Boite)', 'description' => 'Boite de 50 masques', 'category_id' => $catHygiene->id, 'quantity' => 30, 'price' => 1500, 'barcode' => 'MAS-CHI-001', 'supplier' => 'Mediset', 'alert_threshold' => 10],
        ];

        foreach ($products as $prod) {
            Product::firstOrCreate(['barcode' => $prod['barcode']], $prod);
        }

        // --- Seed Stock Movements ---
        $allProducts = Product::all();
        $types = ['entry', 'exit'];

        foreach ($allProducts->take(8) as $product) {
            // Past entries
            for ($i = 0; $i < 3; $i++) {
                $qty = rand(5, 30);
                StockMovement::create([
                    'product_id' => $product->id,
                    'user_id' => $admin->id,
                    'type' => 'entry',
                    'quantity' => $qty,
                    'reference' => 'ENT-' . strtoupper(substr(md5(rand()), 0, 6)),
                    'notes' => "Entrée initiale d'inventaire",
                    'created_at' => now()->subDays(rand(1, 30)),
                    'updated_at' => now()->subDays(rand(1, 30)),
                ]);
            }
            // Some exits
            for ($i = 0; $i < 2; $i++) {
                $qty = rand(1, 5);
                StockMovement::create([
                    'product_id' => $product->id,
                    'user_id' => $manager->id,
                    'type' => 'exit',
                    'quantity' => $qty,
                    'reference' => 'SOR-' . strtoupper(substr(md5(rand()), 0, 6)),
                    'notes' => "Sortie d'inventaire",
                    'created_at' => now()->subDays(rand(1, 15)),
                    'updated_at' => now()->subDays(rand(1, 15)),
                ]);
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
