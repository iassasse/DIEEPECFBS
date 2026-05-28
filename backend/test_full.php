<?php
function apiRequest($method, $url, $data = null, $token = null) {
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    $headers = ['Content-Type: application/json', 'Accept: application/json'];
    if ($token) $headers[] = "Authorization: Bearer $token";
    if ($data) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    $response = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return [$code, json_decode($response, true)];
}

$base = 'http://127.0.0.1:8000/api';
$passed = 0; $failed = 0;

function check($label, $condition) {
    global $passed, $failed;
    if ($condition) { echo "  ✅ $label\n"; $passed++; }
    else             { echo "  ❌ $label\n"; $failed++; }
}

echo "\n=== TEST: LOGIN ===\n";
foreach ([
    ['admin@dieepec.com', 'password123', 'Admin'],
    ['manager@dieepec.com', 'password123', 'Gestionnaire'],
    ['user@dieepec.com', 'password123', 'Utilisateur'],
] as [$email, $password, $expectedRole]) {
    [$code, $data] = apiRequest('POST', "$base/login", compact('email', 'password'));
    check("Login $email → HTTP $code", $code === 200);
    check("  Role is $expectedRole", ($data['user']['role'] ?? '') === $expectedRole);
}

// Use admin token for rest
[$code, $loginData] = apiRequest('POST', "$base/login", ['email' => 'admin@dieepec.com', 'password' => 'password123']);
$token = $loginData['access_token'];

echo "\n=== TEST: DASHBOARD ===\n";
[$code, $data] = apiRequest('GET', "$base/dashboard", null, $token);
check("GET /dashboard → HTTP $code", $code === 200);
check("Has stats.total_products", isset($data['stats']['total_products']));
check("Has chart_weekly data", count($data['chart_weekly']) === 7);
check("Has recent_movements", isset($data['recent_movements']));

echo "\n=== TEST: CATEGORIES CRUD ===\n";
[$code, $cat] = apiRequest('POST', "$base/categories", ['name' => 'TEST_CAT_'.time(), 'description' => 'Test'], $token);
check("POST /categories → HTTP $code", $code === 201);
$catId = $cat['id'];
[$code, $cat] = apiRequest('PUT', "$base/categories/$catId", ['name' => 'TEST_UPDATED_'.time(), 'description' => 'Updated'], $token);
check("PUT /categories/$catId → HTTP $code", $code === 200);
[$code] = apiRequest('DELETE', "$base/categories/$catId", null, $token);
check("DELETE /categories/$catId → HTTP $code", $code === 200);

echo "\n=== TEST: PRODUCTS CRUD ===\n";
[$catCode, $newCat] = apiRequest('POST', "$base/categories", ['name' => 'TMP_'.time()], $token);
[$code, $prod] = apiRequest('POST', "$base/products", [
    'name' => 'Test Product '.time(), 'category_id' => $newCat['id'],
    'quantity' => 20, 'price' => 5000, 'alert_threshold' => 5,
], $token);
check("POST /products → HTTP $code", $code === 201);
$prodId = $prod['id'];
[$code, $updatedProd] = apiRequest('PUT', "$base/products/$prodId", [
    'name' => 'Updated Product', 'category_id' => $newCat['id'],
    'quantity' => 25, 'price' => 6000, 'alert_threshold' => 5,
], $token);
check("PUT /products/$prodId → HTTP $code", $code === 200);

echo "\n=== TEST: STOCK MOVEMENTS ===\n";
[$code, $movement] = apiRequest('POST', "$base/stock-movements", [
    'product_id' => $prodId, 'type' => 'exit', 'quantity' => 5,
    'notes' => 'Test exit',
], $token);
check("POST /stock-movements (exit) → HTTP $code", $code === 201);

// Check stock decreased
[$code, $updatedProdCheck] = apiRequest('GET', "$base/products/$prodId", null, $token);
check("Product quantity updated after exit (25-5=20)", ($updatedProdCheck['quantity'] ?? -1) === 20);

echo "\n=== TEST: NOTIFICATIONS ===\n";
[$code, $notifs] = apiRequest('GET', "$base/notifications", null, $token);
check("GET /notifications → HTTP $code", $code === 200);
check("Has notifications array", isset($notifs['notifications']));

echo "\n=== SUMMARY ===\n";
echo "Passed: $passed | Failed: $failed\n";
echo $failed === 0 ? "🎉 ALL TESTS PASSED!\n" : "⚠️ Some tests failed.\n";
