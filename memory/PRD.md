# Doyuran Güveç Lokantası — Sipariş Yönetim Sistemi

## Original Problem Statement
Turkish casserole/güveç restaurant ("Doyuran Güveç Lokantası") wants to replace WhatsApp + handwritten paper-receipt lunch order taking with a web app where corporate clients view the daily menu, place orders with quantities, and orders auto-print to a thermal printer at the restaurant. Owner wants weekly/monthly analytics on most-ordered dishes.

## Architecture
- Backend: FastAPI + MongoDB (motor)
- Auth: JWT (httpOnly cookies, samesite=none, secure=true), bcrypt passwords, admin/company roles
- Object storage: Emergent Object Storage (menu item images)
- Frontend: React 19 + Tailwind + Shadcn UI + recharts
- Theme: warm earthy (terracotta #C05A46 + cream #F9F6F0), Bricolage Grotesque + Manrope + JetBrains Mono fonts

## User Personas
- Restaurant owner (admin) — single account, manages menu, monitors live order feed, prints receipts, reviews analytics
- Corporate clients (companies) — self-register, browse daily menu, place orders, view own history

## Core Requirements (Static)
- Daily menu with images, names, prices, categories
- Cart-based ordering with quantity selectors and notes
- 80mm thermal-printable receipt with company name/contact/items/total
- Real-time admin order feed with status workflow (yeni → hazırlanıyor → tamamlandı / iptal)
- Analytics: daily revenue trend, top items, top companies (7/30/90 days)
- Turkish UI

## Implemented (2026-04-29)
- ✅ JWT auth (register/login/logout/me)
- ✅ Admin auto-seed (`admin@doyuranguvec.com` / `DoyuranAdmin2026!`)
- ✅ Menu CRUD (admin) + public `/menu/today`
- ✅ Image upload via Emergent object storage with MongoDB file metadata
- ✅ Order placement with sequential daily order_no
- ✅ Order status updates + admin filters (date, status)
- ✅ Analytics aggregation pipeline (daily revenue, top items, top companies)
- ✅ Landing page, login/register, menu+cart, order history, thermal receipt page
- ✅ Admin: dashboard, menu management with image upload, live orders (15s auto-refresh), recharts analytics
- ✅ Backend tests: 31/31 pass

## Backlog / Next Tasks
- P1: Real-time push (websocket / polling) for new orders so receipts auto-print without admin click
- P1: Daily menu copy-from-yesterday shortcut for owner
- P2: Company-level credit/post-paid invoicing (monthly bills)
- P2: SMS / email notifications when order status changes
- P2: Multi-printer support (per-station routing)
- P2: Day-of-week / hourly heatmap on analytics
