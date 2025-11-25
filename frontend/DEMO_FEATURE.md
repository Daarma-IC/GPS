# 🚨 Demo Fall Feature - Testing Tanpa GPS Device

## Penjelasan

Fitur Demo Fall memungkinkan Anda untuk mensimulasikan alert jatuh tanpa perlu GPS device yang sesungguhnya.

## Cara Menggunakan

1. **Buka aplikasi GPS Monitoring** di browser
2. **Lihat tombol "🚨 Demo Fall"** di toolbar (bagian kanan atas, di sebelah koordinat)
3. **Klik tombol tersebut** untuk trigger demo fall alert
4. Akan muncul:
   - **Radar animation** pada peta (3 gelombang merah yang meluas)
   - **Alert di sidebar** dengan informasi jatuh (waktu, lokasi, strength)
   - **Notifikasi ke backend** (akan diteruskan ke Telegram jika backend connected)

## Fitur Demo Fall

### Apa yang Terjadi Saat Klik Demo Fall?

```javascript
// Generate koordinat random di sekitar Jawa Barat (Bandung area)
const baseLat = -6.9;
const baseLng = 107.6;
const randomLat = baseLat + (Math.random() - 0.5) * 0.1; // ±0.05 degrees
const randomLng = baseLng + (Math.random() - 0.5) * 0.1; // ±0.05 degrees

// Generate strength random antara 50-150
const strength = Math.random() * 100 + 50;

// Create fall event dengan timestamp saat ini
// Radar akan tampil selama 10 detik dengan 3 gelombang bertahap
```

### Output yang Dihasilkan

**Di Peta:**
- Radar pulse animation (3 gelombang merah dengan glow)
- Lokasi jatuh acak sekitar Bandung area
- Animasi berlangsung 10 detik

**Di Sidebar (Fall Alerts panel):**
```
🚨 JATUH TERDETEKSI
[Waktu] 
Lat: -6.89234567 | Lng: 107.60123456 | Strength: 87.3
```

**Ke Backend:**
- POST request ke `http://localhost:3001/falls/notify`
- Data: `fall_id`, `fall_lat`, `fall_lng`, `fall_ts`, `fall_strength`
- Backend akan forward ke Telegram jika konfigurasi ada

## Styling Demo Button

**Normal State:**
- Background: Semi-transparent red (`rgba(239, 68, 68, 0.12)`)
- Border: Thin red border
- Text: "🚨 Demo Fall"

**Hover State:**
- Background lebih opaque
- Glow effect (red shadow)
- Smooth transition 0.2s

**Active State (Click):**
- Scale animation (0.98) untuk feedback

## Implementation Details

### Fungsi: `triggerDemoFall()`

**Location:** `src/pages/Home.js` (line 59-92)

```javascript
const triggerDemoFall = () => {
  // Generate koordinat random
  const randomLat = -6.9 + (Math.random() - 0.5) * 0.1;
  const randomLng = 107.6 + (Math.random() - 0.5) * 0.1;
  
  // Create fall event object
  const demoFallId = "DEMO_" + Date.now();
  const demoFall = {
    id: demoFallId,
    lat: randomLat,
    lng: randomLng,
    ts: Date.now(),
    strength: (Math.random() * 100 + 50).toFixed(1),
    expiresAt: Date.now() + 10000 + 3500 // 13.5 detik total
  };
  
  // Update state dengan fall event baru
  setFallEvents(prev => [demoFall, ...prev].slice(0, 20));
  
  // Send ke backend
  sendFallNotificationToBackend({...});
};
```

### Animation Timeline

```
0s:    Radar muncul (gelombang 1)
1.5s:  Gelombang 2 dimulai
3s:    Gelombang 3 dimulai
10s:   Semua gelombang selesai
13.5s: Fall event dihapus dari state
```

## Testing Checklist

- [ ] Klik "Demo Fall" button
- [ ] Lihat radar animation muncul di peta
- [ ] Cek alert muncul di sidebar
- [ ] Cek waktu dan koordinat terupdate
- [ ] Cek strength value random 50-150
- [ ] Klik berkali-kali untuk multiple alerts
- [ ] Lihat koordinat berubah (random dalam 0.1 derajat)
- [ ] Cek backend logs untuk notifikasi yang diterima

## Notes

- **Koordinat Random:** ±0.05 derajat dari center (Bandung)
- **Durasi Radar:** 10 detik animasi + 3.5 detik buffer = 13.5 detik total
- **Max Alerts:** 20 fall events disimpan di state (FIFO queue)
- **ID Format:** "DEMO_[timestamp]" untuk membedakan dari real GPS data
- **Strength:** Random 50-150 (bisa disesuaikan sesuai kebutuhan)

## Customization

Jika ingin mengubah parameter demo:

**File:** `src/pages/Home.js` line 59-92

```javascript
// Ubah area coverage
const baseLat = -6.9;    // Change untuk lat
const baseLng = 107.6;   // Change untuk lng
const spread = 0.1;      // Change untuk area coverage (±0.05)

// Ubah strength range
const strength = (Math.random() * 100 + 50); // Min 50, Max 150
```

## Peringatan

⚠️ **Jangan gunakan di production!** Demo feature ini hanya untuk:
- Testing tanpa GPS device
- Demo kepada stakeholder
- Development & debugging

Pastikan disable atau hapus feature ini sebelum production deployment.
