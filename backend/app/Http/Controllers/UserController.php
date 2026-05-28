<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Role;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\UsersExport;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $query = User::with('roles');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($request->filled('role')) {
            $query->role($request->role);
        }

        $perPage = (int)($request->per_page ?? 15);
        $users = $query->orderBy('name')->paginate($perPage);

        return response()->json($users);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|email|unique:users,email',
            'password' => 'required|string|min:6|confirmed',
            'role'     => 'required|exists:roles,name',
        ]);

        $user = User::create([
            'name'     => $validated['name'],
            'email'    => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        $user->assignRole($validated['role']);
        $user->load('roles');

        return response()->json($this->formatUser($user), 201);
    }

    public function show(User $user)
    {
        return response()->json($this->formatUser($user->load('roles')));
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => ['required', 'email', Rule::unique('users', 'email')->ignore($user->id)],
            'role'     => 'required|exists:roles,name',
            'password' => 'nullable|string|min:6|confirmed',
        ]);

        $user->update([
            'name'  => $validated['name'],
            'email' => $validated['email'],
            ...(!empty($validated['password']) ? ['password' => Hash::make($validated['password'])] : []),
        ]);

        $user->syncRoles([$validated['role']]);
        $user->load('roles');

        return response()->json($this->formatUser($user));
    }

    public function destroy(User $user)
    {
        if ($user->id === auth()->id()) {
            return response()->json(['message' => 'Vous ne pouvez pas supprimer votre propre compte.'], 422);
        }

        $user->delete();
        return response()->json(['message' => 'Utilisateur supprimé avec succès.']);
    }

    public function roles()
    {
        return response()->json(Role::orderBy('name')->get(['id', 'name']));
    }

    private function formatUser(User $user): array
    {
        return [
            'id'         => $user->id,
            'name'       => $user->name,
            'email'      => $user->email,
            'role'       => $user->roles->first()?->name ?? 'Utilisateur',
            'roles'      => $user->roles->pluck('name'),
            'created_at' => $user->created_at,
        ];
    }

    public function export(Request $request)
    {
        $format = $request->query('format', 'xlsx');
        $filename = 'utilisateurs_' . date('Ymd_His');

        $excelFormat = \Maatwebsite\Excel\Excel::XLSX;
        if (strtolower($format) === 'csv') {
            $excelFormat = \Maatwebsite\Excel\Excel::CSV;
            $filename .= '.csv';
        } else {
            $filename .= '.xlsx';
        }

        return Excel::download(
            new UsersExport($request->only(['search', 'role'])),
            $filename,
            $excelFormat
        );
    }
}
