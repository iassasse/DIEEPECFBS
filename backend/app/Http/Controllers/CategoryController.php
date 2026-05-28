<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CategoryController extends Controller
{
    public function index(Request $request)
    {
        $query = Category::withCount('products');

        if ($request->has('search') && $request->search !== '') {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        if ($request->has('per_page')) {
            return response()->json($query->orderBy('name')->paginate((int)$request->per_page));
        }

        return response()->json($query->orderBy('name')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'        => 'required|string|max:255|unique:categories,name',
            'description' => 'nullable|string|max:1000',
        ]);

        $category = Category::create($validated);
        $category->loadCount('products');

        return response()->json($category, 201);
    }

    public function show(Category $category)
    {
        return response()->json($category->load('products')->loadCount('products'));
    }

    public function update(Request $request, Category $category)
    {
        $validated = $request->validate([
            'name'        => ['required', 'string', 'max:255', Rule::unique('categories', 'name')->ignore($category->id)],
            'description' => 'nullable|string|max:1000',
        ]);

        $category->update($validated);
        $category->loadCount('products');

        return response()->json($category);
    }

    public function destroy(Category $category)
    {
        if ($category->products()->count() > 0) {
            return response()->json([
                'message' => 'Impossible de supprimer cette catégorie car elle contient des produits.'
            ], 422);
        }

        $category->delete();
        return response()->json(['message' => 'Catégorie supprimée avec succès.']);
    }
}
