import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ConfettiService {
  private colors = ['#f97316', '#14b8a6', '#7c3aed', '#f59e0b', '#ef4444', '#3b82f6'];

  fire(): void {
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden';
    document.body.appendChild(container);

    for (let i = 0; i < 60; i++) {
      const piece = document.createElement('div');
      const color = this.colors[Math.floor(Math.random() * this.colors.length)];
      const left = Math.random() * 100;
      const delay = Math.random() * 0.5;
      const duration = 1.5 + Math.random() * 1.5;
      const rotation = Math.random() * 360;
      const size = 6 + Math.random() * 6;

      piece.style.cssText = `
        position:absolute;
        top:-10px;
        left:${left}%;
        width:${size}px;
        height:${size * 0.6}px;
        background:${color};
        border-radius:2px;
        animation:confetti-fall ${duration}s ease-in ${delay}s forwards;
        transform:rotate(${rotation}deg);
      `;
      container.appendChild(piece);
    }

    setTimeout(() => container.remove(), 4000);
  }
}
