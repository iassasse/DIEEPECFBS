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
        if ($request->has('name')) {
            $request->merge(['name' => trim($request->name)]);
        }

        $validated = $request->validate([
            'name'        => [
                'required',
                'string',
                'max:255',
                function ($attribute, $value, $fail) {
                    if (Category::whereRaw('LOWER(name) = ?', [strtolower($value)])->exists()) {
                        $fail('La catégorie existe déjà.');
                    }
                }
            ],
            'description' => 'nullable|string|max:1000',
        ], [
            'name.required' => 'Le nom est requis.',
            'name.string'   => 'Le nom doit être une chaîne de caractères.',
            'name.max'      => 'Le nom ne doit pas dépasser 255 caractères.',
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
        if ($request->has('name')) {
            $request->merge(['name' => trim($request->name)]);
        }

        $validated = $request->validate([
            'name'        => [
                'required',
                'string',
                'max:255',
                function ($attribute, $value, $fail) use ($category) {
                    if (Category::whereRaw('LOWER(name) = ?', [strtolower($value)])->where('id', '!=', $category->id)->exists()) {
                        $fail('La catégorie existe déjà.');
                    }
                }
            ],
            'description' => 'nullable|string|max:1000',
        ], [
            'name.required' => 'Le nom est requis.',
            'name.string'   => 'Le nom doit être une chaîne de caractères.',
            'name.max'      => 'Le nom ne doit pas dépasser 255 caractères.',
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

    public function destroyBulk(Request $request)
    {
        if ($request->boolean('all')) {
            if (!$request->user()->hasRole('Admin')) {
                return response()->json(['message' => 'Accès non autorisé. Seuls les administrateurs peuvent tout supprimer.'], 403);
            }
            if (\App\Models\Product::exists()) {
                return response()->json([
                    'message' => 'Impossible de tout supprimer car certaines familles contiennent des produits. Veuillez d\'abord supprimer les produits.'
                ], 422);
            }
            Category::query()->delete();
            return response()->json(['message' => 'Toutes les familles ont été supprimées avec succès.']);
        }

        $validated = $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:categories,id'
        ]);

        $hasProducts = \App\Models\Product::whereIn('category_id', $validated['ids'])->exists();
        if ($hasProducts) {
            return response()->json([
                'message' => 'Impossible de supprimer ces familles car certaines contiennent des produits.'
            ], 422);
        }

        Category::whereIn('id', $validated['ids'])->delete();

        return response()->json(['message' => 'Les familles sélectionnées ont été supprimées avec succès.']);
    }
}
