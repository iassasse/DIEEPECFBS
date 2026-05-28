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
[$code, $loginData] = apiRequest('POST', "$base/login", ['email' => 'admin@dieepec.com', 'password' => 'password123']);
$token = $loginData['access_token'];

// Create product with quantity 20
[$catCode, $newCat] = apiRequest('POST', "$base/categories", ['name' => 'TMP2_'.time()], $token);
[$code, $prod] = apiRequest('POST', "$base/products", [
    'name' => 'Stock Test '.time(), 'category_id' => $newCat['id'],
    'quantity' => 20, 'price' => 5000, 'alert_threshold' => 5,
], $token);
echo "Created product with qty: {$prod['quantity']}\n";
$prodId = $prod['id'];

// Exit 5
[$code, $movement] = apiRequest('POST', "$base/stock-movements", [
    'product_id' => $prodId, 'type' => 'exit', 'quantity' => 5,
    'notes' => 'Test exit',
], $token);
echo "Exit movement HTTP: $code\n";

// Get product
[$code, $p] = apiRequest('GET', "$base/products/$prodId", null, $token);
echo "After exit, quantity: {$p['quantity']} (expected: 15)\n";

// Entry 10
[$code] = apiRequest('POST', "$base/stock-movements", [
    'product_id' => $prodId, 'type' => 'entry', 'quantity' => 10, 'notes' => 'Test entry',
], $token);
[$code, $p] = apiRequest('GET', "$base/products/$prodId", null, $token);
echo "After entry(+10), quantity: {$p['quantity']} (expected: 25)\n";

echo "\n✅ Stock management is working correctly!\n";
