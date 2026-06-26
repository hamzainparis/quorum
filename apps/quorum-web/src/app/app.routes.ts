import { inject } from '@angular/core';
import { CanActivateFn, Route, Router } from '@angular/router';

function generateRoomCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

const redirectToNewRoom: CanActivateFn = () => {
  const router = inject(Router);
  return router.createUrlTree(['/r', generateRoomCode()]);
};

export const appRoutes: Route[] = [
  { path: '', canActivate: [redirectToNewRoom], pathMatch: 'full', children: [] },
  {
    path: 'r/:roomCode',
    loadComponent: () => import('@quorum/web-feature-room-shell').then((m) => m.RoomShell),
  },
];
