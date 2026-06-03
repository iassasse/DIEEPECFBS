<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('inventory_number')->nullable()->unique();
            $table->text('designation');
            $table->text('description')->nullable();
            $table->foreignId('category_id')->constrained()->onDelete('cascade');
            $table->integer('quantity')->default(0);
            $table->decimal('price', 15, 2)->default(0.00); // Prix d'acquisition HT unitaire
            $table->string('location')->nullable();
            $table->string('brand')->nullable();
            $table->string('serial_number')->nullable();
            $table->string('user_service')->nullable();
            $table->string('purchase_reference')->nullable();
            $table->string('supplier')->nullable();
            $table->integer('alert_threshold')->default(0);
            $table->string('image')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
