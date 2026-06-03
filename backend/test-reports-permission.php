<?php
require 'c:/Users/lenovo/Desktop/project/backend/vendor/autoload.php';
$app = require_once 'c:/Users/lenovo/Desktop/project/backend/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use Illuminate\Http\Request;

// Find user@dieepec.com (which has the Utilisateur role)
$user = User::where('email', 'user@dieepec.com')->first();
if (!$user) {
    echo "Utilisateur user not found!\n";
    exit;
}

echo "Testing Reports permission for User: {$user->name} (Role: {$user->role})\n";

// Authenticate user
$app['auth']->guard('sanctum')->setUser($user);

// Setup Request for reports index
$request = Request::create('/api/reports', 'GET', ['type' => 'stock']);
$request->headers->set('Accept', 'application/json');
$request->setUserResolver(fn() => $user);

try {
    $response = $app->handle($request);
    echo "Reports Access Response Status: " . $response->getStatusCode() . "\n";
    
    if ($response->getStatusCode() === 200) {
        echo "SUCCESS: Utilisateur role can now successfully access the reports data!\n";
    } else {
        echo "FAILURE: Status is " . $response->getStatusCode() . "\n";
        echo "Response Content: " . $response->getContent() . "\n";
    }
} catch (\Exception $e) {
    echo "Exception occurred: " . $e->getMessage() . "\n";
}
