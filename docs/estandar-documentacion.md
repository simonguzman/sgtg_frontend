# Estándar de documentación del código

Este documento define cómo se documenta el código del FrontEnd. Se basa en tres referencias:

- **TSDoc**: sintaxis de los comentarios de documentación en TypeScript (`/** ... */`, `@param`, `@returns`). https://tsdoc.org/
- **Google TypeScript Style Guide**: qué se documenta y qué no. https://google.github.io/styleguide/tsguide.html#comments-documentation
- **Guía de estilo de Angular**: estructura de servicios, fachadas y componentes. https://angular.dev/style-guide

## 1. Qué se documenta

Con un comentario JSDoc (`/** ... */`), siempre:

| Elemento | Qué dice el JSDoc |
|---|---|
| Servicios, fachadas y mappers (`*.service.ts`) | Para qué existe la clase y, en cada miembro público, qué hace o qué contiene. |
| Guards, interceptores y resolvers | Qué deja pasar o qué hace con la petición, y a dónde lleva cuando no deja pasar. |
| Helpers y utilidades (funciones exportadas) | Qué calculan; `@param` y `@returns` cuando el nombre no basta. |
| Interfaces, tipos y enums exportados | Qué representan; en los campos, solo lo que el nombre no dice (unidades, `null`, origen del dato). |
| Componentes | Una línea con qué muestra o qué permite hacer. En los componentes compartidos (`shared`), también las entradas y salidas que no son obvias. |
| Constantes exportadas (rutas, columnas, opciones, plazos) | Qué configuran. |

Los métodos de los componentes que solo responden a eventos de la plantilla (`onSubmit`, `goBack`, `toggle...`) no se documentan si su nombre ya lo dice.

## 2. Cómo se escribe

- En español, en tercera persona y en presente: «Carga el trabajo de la ruta», no «Este método se encarga de cargar...».
- Primero el qué; después, si hace falta, el porqué (una regla del reglamento, una restricción del backend o del navegador).
- Sin repetir los tipos: TypeScript ya los dice. `@param` y `@returns` describen el significado, no el tipo.
- Las reglas de negocio se escriben en el JSDoc del método que las aplica, no en comentarios dentro del cuerpo.
- Una línea si cabe en 110 caracteres; si no, un bloque de varias líneas.

```ts
/**
 * Estado de una versión según los conceptos de sus evaluadores, con la misma regla del backend: en revisión
 * hasta que conceptúen todos; si alguno no aprueba, no aprobado; si alguno pide correcciones, evaluado con
 * observaciones; si no, aprobado.
 */
calculateDocumentStatus(documentId: string, evaluations: Evaluation[], totalEvaluators: number): stateList
```

## 3. Qué no se escribe

- **Historia de cambios**: «antes», «ahora», «NUEVO», «FIX», «se cambió por...», «nombres originales conservados». Eso lo registra Git.
- **Comentarios que repiten el código**: «// Recorre la lista», «// Asigna el valor».
- **Separadores de secciones**: `// ====`, `// ── Consultas ──`. Si una clase necesita secciones, probablemente necesita dividirse.
- **Código comentado**: se borra; queda en Git.
- **Comentarios en las plantillas HTML** (`<!-- -->`): la estructura se lee en el propio HTML.
- **Comentarios en las pruebas**: el nombre de cada `describe` e `it` describe el caso. Los JSDoc de las funciones auxiliares de prueba sí se permiten.

## 4. Excepciones permitidas

Se mantienen solo estos comentarios fuera de JSDoc:

- Directivas para las herramientas: `// eslint-disable-next-line <regla>` y `// @ts-expect-error <motivo>`, siempre con su justificación en la misma línea o en la anterior.
- Marcadores en funciones vacías intencionales (por ejemplo, `/* lo reemplaza registerOnChange */` en un `ControlValueAccessor`).
- En las hojas de estilo globales (`src/styles`), los encabezados de sección y la explicación de los ajustes para un navegador específico.

## 5. Cómo se revisa

- `npx tsc -p tsconfig.app.json --noEmit` y `npm run lint` deben terminar sin errores.
- `npm run test:all` debe pasar completo.
- Antes de un commit, revisar en el diff que no queden comentarios de historia ni código comentado.
