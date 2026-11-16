# Brief: app "Marcianitos" (Android)

App de gestión para el emprendimiento de jugitos caseros de una chica de 16 años. La usa **solo ella**, desde su celular. Todo está pensado para que casi no tenga que escribir: botones y listas.

## Objetivo

Reemplazar el cuaderno donde hoy anota pedidos, ventas y gastos. La prioridad de la primera versión es **ver de un vistazo cuánto ganó, cuánto perdió, cuánto compró de cada cosa y cuántos jugitos vendió de cada sabor**.

## Datos del negocio

- **Producto:** jugitos en bolsita, un solo tamaño (4x18 cm). Las bolsitas vacías son de 4x25 cm.
- **Sabores de crema (5):** chocotorta, oreo, flan con dulce de leche, frutilla, banana split.
- **Sabores de agua (3):** galáctico, frutilla, uva.
- Los sabores y precios tienen que poder **editarse desde la app** (puede agregar sabores nuevos).
- **Dónde vende:** WhatsApp, la escuela y el barrio.
- **Cobros:** efectivo y transferencia.

### Precios

| | Unidad | Desde 10 | Desde 20 | Desde 30 |
|---|---|---|---|---|
| Crema | $800 | $700 c/u | $650 c/u | $600 c/u |
| Agua | $500 | $450 c/u | $400 c/u | $350 c/u |

Supuesto: el descuento se calcula contando por separado las unidades de crema y las de agua dentro de un mismo pedido. El precio final debe poder corregirse a mano en cada pedido.

## Pantallas de la primera versión

### 1. Inicio (resumen)
- Dos números **bien grandes**: **GANADO** y **PERDIDO**, más el balance.
  - Ganado = plata cobrada (ventas por unidad + pagos y señas de pedidos).
  - Perdido = lo gastado en compras de insumos.
  - Balance verde si es positivo, rojo si es negativo.
- Selector de período: hoy, esta semana, este mes.
- Debajo: ranking de sabores más vendidos y total de deudas pendientes.

### 2. Vender (ventas por unidad)
- Una grilla con un botón por sabor. Un toque suma un jugito vendido, con contador visible y botón para deshacer.
- Confirmar el cobro del día o de cada venta (efectivo o transferencia).
- Es la pantalla que más va a usar, así que tiene que ser rápida.

### 3. Pedidos mayoristas
- Lista de pedidos con estado: **por preparar → preparado → entregado**.
- Cada pedido guarda: cliente (de una lista), fecha de entrega, cantidad por sabor, precio calculado automáticamente con el descuento por cantidad, forma de pago.
- **Pago:** sin pagar / con seña / pagado. La seña es opcional, a elección del cliente. Se muestra cuánto falta cobrar.
- Pasar de estado con un toque.

### 4. Clientes y deudas
- Lista de clientes mayoristas con nombre y su historial de pedidos.
- Vista de **quién debe plata** y cuánto.

### 5. Compras de insumos
- Registrar una compra: insumo (de una lista), cantidad, precio total, fecha. Foto del ticket opcional, porque hoy guarda los tickets.
- Insumos iniciales: masitas (oreos, chocolinas), dulce de leche, crema, frutilla, banana, flan de vainilla, azúcar, maicena, leche en polvo, esencia de vainilla, leche, bolsitas 4x25 cm, jugos en sobrecitos.
- Ver cuánto compró de cada insumo en un período.

### 6. Bolsitas y aviso de stock
- Registrar cuando hace una **tanda** (cuántos jugitos hizo de cada sabor), lo que descuenta bolsitas.
- **Aviso cuando quedan pocas bolsitas.** Es el único insumo con aviso en esta versión.
- Pendiente de definir: cuántas bolsitas trae cada paquete y con cuántas debería avisar.

## Diseño

- Nombre: **Marcianitos**. No hay logo: usar el nombre como texto estilizado (se puede cambiar después).
- Colores: **rosa, beige y blanco**.
- Botones grandes, poco texto para escribir, español de Argentina, montos en pesos sin decimales.

## Requisitos técnicos

- **Celular de destino:** Samsung Galaxy A04 (gama de entrada), así que la app tiene que ser liviana.
- **Funciona sin internet.** Los datos se guardan en el celular.
- **Respaldo:** botón para exportar una copia de los datos (por ejemplo, para mandarse por WhatsApp o guardarla en Drive), por si pierde o se rompe el celu. También exportar a Excel/CSV si es fácil.
- **Sin cuentas, sin login, sin publicidad ni analíticas.** Los datos de los clientes no salen del celular.
- **Distribución:** instalar por APK. No se publica en Google Play por ahora.

## Fuera de esta versión

Pagos dentro de la app, catálogo para clientes, integración con WhatsApp o Instagram, ganancia por sabor según el costo de cada receta, control de cantidad exacta de todos los insumos, varios usuarios.

## Para confirmar con ella (antes o después de la primera versión)

1. ¿"Ganado" y "perdido" son lo que entendimos (plata cobrada y plata gastada) o quiere verlos de otra forma?
2. ¿Cuántas bolsitas trae un paquete y con cuántas quiere que avise?
3. ¿El descuento por cantidad se cuenta por tipo (crema y agua por separado), como se supuso?
4. ¿Prefiere ver el aviso de bolsitas dentro de la app o también como notificación del celular?
