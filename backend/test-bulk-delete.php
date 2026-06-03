<?php
require 'c:/Users/lenovo/Desktop/project/backend/vendor/autoload.php';
$app = require_once 'c:/Users/lenovo/Desktop/project/backend/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Product;
use App\Models\Category;
use App\Models\StockMovement;
use App\Models\User;
use Illuminate\Http\Request;

// Find or create a user for authentication
$user = User::first();
if (!$user) {
    echo "No user found in database!\n";
    exit;
}
// Set user role to Admin to bypass any gates
if (method_exists($user, 'assignRole')) {
    $user->assignRole('Admin');
}

// 1. Get or create a Category
$category = Category::first();
if (!$category) {
    $category = Category::create([
        'name' => 'Bulk Test Category',
        'description' => 'Used for testing bulk delete'
    ]);
}
echo "Using Category ID: {$category->id} ({$category->name})\n";

// 2. Create products to test bulk delete
$p1 = Product::create([
    'designation' => 'Bulk Product 1',
    'category_id' => $category->id,
    'quantity' => 10,
    'price' => 50,
    'alert_threshold' => 2
]);

$p2 = Product::create([
    'designation' => 'Bulk Product 2',
    'category_id' => $category->id,
    'quantity' => 20,
    'price' => 150,
    'alert_threshold' => 5
]);

echo "Created product 1 ID: {$p1->id}\n";
echo "Created product 2 ID: {$p2->id}\n";

// Authenticate user
$app['auth']->guard('sanctum')->setUser($user);

// Setup Request for bulk delete
$request = Request::create('/api/products', 'DELETE', ['ids' => [$p1->id, $p2->id]]);
$request->headers->set('Accept', 'application/json');
$request->setUserResolver(fn() => $user);

try {
    $response = $app->handle($request);
    echo "Bulk Delete Products Response Status: " . $response->getStatusCode() . "\n";
    echo "Response Content: " . $response->getContent() . "\n";
    
    // Verify in database
    $existsP1 = Product::find($p1->id) !== null;
    $existsP2 = Product::find($p2->id) !== null;
    echo "Product 1 exists in DB: " . ($existsP1 ? "YES" : "NO") . "\n";
    echo "Product 2 exists in DB: " . ($existsP2 ? "YES" : "NO") . "\n";
} catch (\Exception $e) {
    echo "Products Bulk Delete Exception: " . $e->getMessage() . "\n";
}

// 3. Test Bulk Delete Categories
$cat1 = Category::create(['name' => 'Bulk Cat 1', 'description' => 'Test']);
$cat2 = Category::create(['name' => 'Bulk Cat 2', 'description' => 'Test']);
echo "Created category 1 ID: {$cat1->id}\n";
echo "Created category 2 ID: {$cat2->id}\n";

$requestCat = Request::create('/api/categories', 'DELETE', ['ids' => [$cat1->id, $cat2->id]]);
$requestCat->headers->set('Accept', 'application/json');
$requestCat->setUserResolver(fn() => $user);

try {
    $response = $app->handle($requestCat);
    echo "Bulk Delete Categories Response Status: " . $response->getStatusCode() . "\n";
    echo "Response Content: " . $response->getContent() . "\n";
    
    // Verify in database
    $existsCat1 = Category::find($cat1->id) !== null;
    $existsCat2 = Category::find($cat2->id) !== null;
    echo "Category 1 exists in DB: " . ($existsCat1 ? "YES" : "NO") . "\n";
    echo "Category 2 exists in DB: " . ($existsCat2 ? "YES" : "NO") . "\n";
} catch (\Exception $e) {
    echo "Categories Bulk Delete Exception: " . $e->getMessage() . "\n";
}

// 4. Test Category Deletion Constraint (cannot delete a category if it has products)
$catWithProduct = Category::create(['name' => 'Cat with Product', 'description' => 'Test']);
$prod = Product::create([
    'designation' => 'Product in Cat',
    'category_id' => $catWithProduct->id,
    'quantity' => 10,
    'price' => 50,
    'alert_threshold' => 2
]);
echo "Created Cat {$catWithProduct->id} with Product {$prod->id}\n";

$requestCatConstraint = Request::create('/api/categories', 'DELETE', ['ids' => [$catWithProduct->id]]);
$requestCatConstraint->headers->set('Accept', 'application/json');
$requestCatConstraint->setUserResolver(fn() => $user);

try {
    $response = $app->handle($requestCatConstraint);
    echo "Delete Cat With Product Response Status: " . $response->getStatusCode() . "\n";
    echo "Response Content: " . $response->getContent() . "\n";
    
    // Cleanup product first then category
    $prod->delete();
    $catWithProduct->delete();
} catch (\Exception $e) {
    echo "Cat constraint test exception: " . $e->getMessage() . "\n";
}

// 5. Test Stock Movements Bulk Delete and Reset All
// Let's create a temporary product for this
$testProd = Product::create([
    'designation' => 'Stock Test Product',
    'category_id' => $category->id,
    'quantity' => 100, // Starting quantity
    'price' => 10,
    'alert_threshold' => 5
]);
echo "Created Test Product ID: {$testProd->id} with quantity {$testProd->quantity}\n";

// Create two movements
$m1 = StockMovement::create([
    'product_id' => $testProd->id,
    'type' => 'entry',
    'quantity' => 20,
    'reference' => 'TEST-IN',
    'user_id' => $user->id
]);
$m2 = StockMovement::create([
    'product_id' => $testProd->id,
    'type' => 'exit',
    'quantity' => 5,
    'reference' => 'TEST-OUT',
    'user_id' => $user->id
]);
echo "Created movement 1 ID: {$m1->id}, movement 2 ID: {$m2->id}\n";

// We need to reload product to check its quantity after movements.
// Note: In typical app flow, the controller increments/decrements quantity, but let's check
// if the DB triggers or controller did it.
// Let's call the delete API for these two movements
$requestMovements = Request::create('/api/stock-movements', 'DELETE', ['ids' => [$m1->id, $m2->id]]);
$requestMovements->headers->set('Accept', 'application/json');
$requestMovements->setUserResolver(fn() => $user);

try {
    $response = $app->handle($requestMovements);
    echo "Bulk Delete Movements Response Status: " . $response->getStatusCode() . "\n";
    echo "Response Content: " . $response->getContent() . "\n";
    
    // Verify in database
    $existsM1 = StockMovement::find($m1->id) !== null;
    $existsM2 = StockMovement::find($m2->id) !== null;
    echo "Movement 1 exists in DB: " . ($existsM1 ? "YES" : "NO") . "\n";
    echo "Movement 2 exists in DB: " . ($existsM2 ? "YES" : "NO") . "\n";
} catch (\Exception $e) {
    echo "Movements Bulk Delete Exception: " . $e->getMessage() . "\n";
}

// Clean up test Product
$testProd->delete();

echo "All tests completed!\n";
