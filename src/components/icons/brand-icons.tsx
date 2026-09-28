// lucide-react 1.x marka logolarını (Instagram/Facebook/LinkedIn) tamamen kaldırdı.
// Bu dosya, kaldırılan ikonları eski lucide-react 0.460.0'daki path verisiyle birebir
// aynı görünümü koruyacak şekilde `createLucideIcon` ile yeniden oluşturur — böylece
// hem görsel değişmez hem de `LucideIcon` tipiyle (size/className/vb.) uyumlu kalır.
import { createLucideIcon } from "lucide-react";

export const InstagramIcon = createLucideIcon("Instagram", [
  ["rect", { width: "20", height: "20", x: "2", y: "2", rx: "5", ry: "5" }],
  ["path", { d: "M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" }],
  ["line", { x1: "17.5", x2: "17.51", y1: "6.5", y2: "6.5" }],
]);

export const FacebookIcon = createLucideIcon("Facebook", [
  ["path", { d: "M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" }],
]);

export const LinkedinIcon = createLucideIcon("Linkedin", [
  ["path", { d: "M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" }],
  ["rect", { width: "4", height: "12", x: "2", y: "9" }],
  ["circle", { cx: "4", cy: "4", r: "2" }],
]);
