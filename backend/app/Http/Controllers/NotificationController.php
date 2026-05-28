<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $notifications = $request->user()
            ->notifications()
            ->orderByDesc('created_at')
            ->take(50)
            ->get()
            ->map(fn ($n) => [
                'id'         => $n->id,
                'data'       => is_string($n->data) ? json_decode($n->data, true) : $n->data,
                'read_at'    => $n->read_at,
                'created_at' => $n->created_at,
            ]);

        $unread = $request->user()->unreadNotifications()->count();

        return response()->json([
            'notifications' => $notifications,
            'unread_count'  => $unread,
        ]);
    }

    public function markAsRead(Request $request, string $id)
    {
        $notification = $request->user()->notifications()->where('id', $id)->first();

        if ($notification) {
            $notification->markAsRead();
        }

        return response()->json(['message' => 'Notification marquée comme lue.']);
    }

    public function markAllAsRead(Request $request)
    {
        $request->user()->unreadNotifications->markAsRead();
        return response()->json(['message' => 'Toutes les notifications ont été marquées comme lues.']);
    }

    public function destroy(Request $request, string $id)
    {
        $request->user()->notifications()->where('id', $id)->delete();
        return response()->json(['message' => 'Notification supprimée.']);
    }

    public function destroyAll(Request $request)
    {
        $request->user()->notifications()->delete();
        return response()->json(['message' => 'Toutes les notifications ont été supprimées.']);
    }
}
