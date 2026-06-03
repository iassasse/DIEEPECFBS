<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $fillable = [
        'inventory_number', 'designation', 'description', 'category_id', 'quantity', 'price', 
        'location', 'brand', 'serial_number', 'user_service', 'purchase_reference',
        'supplier', 'alert_threshold', 'image'
    ];

    protected $appends = ['name', 'barcode'];

    public function getNameAttribute()
    {
        return $this->designation;
    }

    public function getBarcodeAttribute()
    {
        return $this->inventory_number;
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function stockMovements()
    {
        return $this->hasMany(StockMovement::class);
    }
}
