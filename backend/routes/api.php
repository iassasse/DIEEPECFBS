<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\StockMovementController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\BackupController;
use App\Http\Controllers\ReportController;

// Public routes
Route::post('/login', [AuthController::class, 'login']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // Categories
    Route::delete('/categories', [CategoryController::class, 'destroyBulk']);
    Route::apiResource('categories', CategoryController::class);

    // Products Export & Import (Must be before resource)
    Route::get('/products/export', [ProductController::class, 'export']);
    Route::post('/products/import', [ProductController::class, 'import']);
    Route::delete('/products', [ProductController::class, 'destroyBulk']);
    Route::apiResource('products', ProductController::class);

    // Stock movements Export & Resource
    Route::get('/stock-movements/export', [StockMovementController::class, 'export']);
    Route::delete('/stock-movements', [StockMovementController::class, 'destroyBulk']);
    Route::apiResource('stock-movements', StockMovementController::class)->except(['update']);

    // Users Export & Resource (Admin only)
    Route::get('/users/export', [UserController::class, 'export']);
    Route::get('/roles', [UserController::class, 'roles']);
    Route::apiResource('users', UserController::class);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
    Route::delete('/notifications/{id}', [NotificationController::class, 'destroy']);
    Route::delete('/notifications', [NotificationController::class, 'destroyAll']);

    // Security (Password change)
    Route::post('/change-password', [AuthController::class, 'changePassword']);

    // Backups (Admin only)
    Route::get('/backups', [BackupController::class, 'index']);
    Route::post('/backups', [BackupController::class, 'create']);
    Route::get('/backups/{filename}/download', [BackupController::class, 'download']);
    Route::post('/backups/restore', [BackupController::class, 'restore']);
    Route::delete('/backups/{filename}', [BackupController::class, 'destroy']);

    // Reports
    Route::get('/reports', [ReportController::class, 'index']);
    Route::get('/reports/pdf', [ReportController::class, 'exportPdf']);
    Route::get('/reports/excel', [ReportController::class, 'exportExcel']);
});

