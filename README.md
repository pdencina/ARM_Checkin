# ARM Kids & Tweens · Check-in

Sistema de check-in para los ministerios **Kids** y **Tweens** de ARM Global.
Cuando un padre deja a su hijo, el sistema genera un **código de seguridad** que se
imprime tanto en el **sticker adhesivo del niño** como en el **comprobante del padre**.
Para retirar al niño, el código de ambos debe coincidir.

Stack: **Next.js 14 (App Router) · TypeScript · Tailwind · Supabase · Vercel**
Impresión: **Brother QL-820NWB** con rollo **DK-2205** (62 mm continuo, papel adhesivo).

---

## 1. Base de datos (Supabase)

1. Crea un proyecto en Supabase.
2. En **SQL Editor**, pega y ejecuta el contenido de [`supabase/schema.sql`](supabase/schema.sql).
   Esto crea las tablas (`guardians`, `children`, `guardian_children`, `services`,
   `checkins`), las funciones `do_checkin` / `do_checkout`, el generador de códigos
   y las políticas RLS.
3. Crea el primer usuario del staff en **Authentication → Users → Add user**
   (con email y contraseña; marca "Auto Confirm").

## 2. Variables de entorno

Copia `.env.local.example` a `.env.local` y completa:

```
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

(Ambas están en Supabase → Project Settings → API.)

## 3. Correr en local

```bash
npm install
npm run dev
```

Abre http://localhost:3000 → te lleva al login.

## 4. Desplegar en Vercel

1. Sube el repo a GitHub.
2. Importa el proyecto en Vercel.
3. Agrega las dos variables de entorno (las mismas de `.env.local`).
4. Deploy.

---

## 5. Configurar la impresora Brother QL-820NWB

La estación es un PC/Mac con Chrome en el mostrador de check-in.

1. **Instala el driver** de Brother (P-touch / driver oficial) para la QL-820NWB.
   Conéctala por **USB** (lo más estable para una estación fija) o por red WiFi/Ethernet.
2. Carga el rollo **DK-2205** (62 mm continuo). En las preferencias del driver,
   configura el tamaño de papel a **62 mm de ancho** y largo continuo (~75 mm),
   y activa el **corte automático**.
3. Marca la QL-820NWB como **impresora por defecto** del sistema.

### Impresión silenciosa (sin diálogo)

El sistema abre la vista de etiqueta y llama a `window.print()`. Para que salga
directo sin cuadro de diálogo, lanza Chrome en modo *kiosk printing*:

**Windows** (crea un acceso directo con este destino):
```
chrome.exe --kiosk-printing --app=https://TU-APP.vercel.app
```

**macOS**:
```
open -a "Google Chrome" --args --kiosk-printing
```

Con `--kiosk-printing`, Chrome imprime automáticamente en la impresora por defecto.
El tamaño de la etiqueta ya está fijado en CSS (`@page { size: 62mm 75mm }`).

> Si más adelante quieres impresión 100% desatendida desde varios equipos o sin
> tocar flags de Chrome, el siguiente paso natural es **PrintNode** (un cliente
> local que recibe el PDF y lo manda a la impresora vía API). El código está
> organizado para agregar ese transporte sin reescribir las pantallas.

---

## 6. Flujo de uso

1. **Servicios** → crea el culto del día y déjalo *Activo*.
2. **Familias** → registra tutores y sus niños (nombre, ministerio, alergias).
3. **Check-in** → busca la familia, selecciona a los niños, "Registrar e imprimir".
   Salen los stickers de cada niño + el comprobante del padre con los mismos códigos.
4. **Retiro** → ingresa el código del comprobante; el sistema muestra al niño y
   permite entregarlo solo si el código coincide.
5. **Inicio** → ves cuántos niños hay en sala en tiempo real.

---

## Estructura

```
app/
  login/                 Login
  (app)/
    dashboard/           Presentes ahora
    checkin/             Estación de check-in
    checkout/            Retiro con verificación
    familias/            ABM de tutores y niños
    servicios/           ABM de servicios
  print/[ids]/           Etiquetas a tamaño exacto + auto-print
lib/supabase/            Clientes Supabase (browser + server)
lib/types.ts             Tipos del dominio
components/Sidebar.tsx    Navegación
supabase/schema.sql      Esquema completo de la base de datos
middleware.ts            Protección de rutas / sesión
```

---

## 7. Roles y permisos (multiusuario)

Después de `schema.sql`, ejecuta [`supabase/roles.sql`](supabase/roles.sql) en el SQL Editor.
Esto agrega perfiles por usuario, un catálogo de roles y una matriz de permisos por módulo.

**Importante:** dentro de `roles.sql` hay una línea para nombrar al administrador:

```sql
update profiles set rol = 'admin' where email = 'admin@kids.cl';
```

Cámbiala por el email de **tu** cuenta antes de ejecutar (o ejecútala aparte después).

### Roles que vienen por defecto
- **Administrador**: acceso total. Gestiona usuarios y permisos.
- **Líder**: check-in, retiro, familias y servicios. No ve Usuarios.
- **Solo retiro**: solo el módulo de Retiro (verificar código y entregar niños).

### Cómo funciona
- Cada módulo tiene dos permisos: **Ver** (entra a la sección) y **Gestionar** (crear/editar/eliminar).
- El admin asigna roles y edita la matriz desde la pantalla **Usuarios** (solo visible para admin).
- Los permisos se aplican en el sidebar (oculta lo no permitido) **y** en la base de datos
  vía RLS, así que no es solo cosmético: un usuario sin permiso tampoco puede leer/escribir
  esos datos aunque entre por URL.

### Agregar gente al equipo
Las cuentas se crean en **Supabase → Authentication → Users** (email + contraseña).
Al crearse, aparecen solas en la pantalla *Usuarios* para asignarles un rol.
