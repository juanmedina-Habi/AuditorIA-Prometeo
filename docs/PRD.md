# PRD de AuditorIA

## Ficha Técnica

| Project Owner (DRI)     | Juan Pablo Medina Diaz                                                                       |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| Stakeholders            | Geraldin Paola Castrillo Cantillo, Nicolas Bolaños Rojas, Ismael Alejandro Fernandez Ramirez |
| Link de Repo en Github: | [Se llena luego en la ejecución]                                                             |
| Link de AppScript Dev:  | [Se llena luego en la ejecución]                                                             |
| Link de AppScript Prod: | [Se llena luego en la ejecución]                                                             |

## I. PRD (Product Requirement Document)

### 1. El Problema

*¿Qué dolor específico estamos resolviendo? Evita saltar a la solución.*

Actualmente, los procesos de auditoría de pricing dependen en gran medida de revisiones manuales, muestras limitadas y validaciones operativas que consumen tiempo del equipo. Esto hace que la cobertura de auditoría sea baja frente al volumen total de casos y que la detección de errores no siempre ocurra de forma oportuna.

Este dolor impacta directamente la capacidad de controlar el riesgo asumido por la compañía en los inmuebles que compra, ya que errores en etapas como pricing inicial, revisión de documentos, pricing comité o aprobaciones pueden pasar desapercibidos si no entran en la muestra revisada.

Además, al no tener una revisión sistemática y trazable de todos los procesos, el equipo debe invertir tiempo en tareas repetitivas, mientras que los casos realmente críticos pueden tardar más en identificarse. Esto limita la eficiencia operativa, la trazabilidad de hallazgos y la capacidad de escalar la auditoría a todos los procesos de pricing.

### 2. Impacto en el Negocio

*¿Qué gana la compañía al resolver esto? (Money, Strategy, Risk)*

#### Beneficio Directo

La compañía gana mayor cobertura, eficiencia y control en los procesos de auditoría de pricing. Al automatizar validaciones que hoy dependen de revisiones manuales, el equipo puede pasar de auditar una muestra limitada de casos a revisar de forma sistemática la mayoría de los procesos críticos.

Esto permite:

- Reducir tiempos operativos en revisiones repetitivas.
- Detectar errores de forma más temprana.
- Disminuir el riesgo de decisiones de pricing basadas en información incorrecta.
- Priorizar la revisión manual solo en casos con alertas reales.
- Mejorar la trazabilidad de hallazgos y decisiones.
- Aumentar la cobertura de auditoría sin aumentar proporcionalmente la carga operativa del equipo.

En términos de riesgo, ayuda a evitar que errores en georreferenciación, uso de modelos, comparables, documentos, comité o aprobaciones pasen desapercibidos y terminen afectando la calidad de las decisiones de compra.

#### Alineación Estratégica

AuditorIA habilita una auditoría de pricing más escalable, trazable y preventiva, alineada con el objetivo de gestionar correctamente el riesgo asumido por la compañía en los inmuebles que compra.

La iniciativa desbloquea la posibilidad de evolucionar de una auditoría reactiva y basada en muestras hacia un modelo de control continuo, donde los procesos de pricing puedan ser monitoreados de forma automática y diaria.

A largo plazo, esto permite fortalecer la calidad del pricing, mejorar la confianza en las decisiones de compra y construir una base más sólida para escalar la auditoría a pricing inicial, revisión documental, pricing comité, aprobaciones y demás procesos críticos del ciclo de evaluación de inmuebles.

### 3. Outcome Esperado

*¿Cómo mediremos si obtuvimos ese impacto?*

- **KPI:** Cobertura de auditoría automatizada de procesos de pricing
- **Fórmula de Cálculo:** Número de casos de pricing auditados automáticamente / Total de casos de pricing generados
- **Temporalidad de Medición:** Medición semanal y cierre mensual, revisando especialmente el avance durante las últimas dos semanas de cada sprint o cada cierre de mes.
- **Línea Base (Actual):** Actualmente, la cobertura promedio de auditoría durante el año ha estado cerca del 10% de los casos revisados manualmente. En el último mes se alcanzó aproximadamente un 26% de cobertura.
- **Meta (Target):** Para la primera fase enfocada en pricing inicial, alcanzar una cobertura automatizada entre 90% y 100% de los casos generados diariamente.

### 4. Alcance

*Mata la ambigüedad. Qué entra y qué NO entra.*

| ✅ Lo que SÍ va a hacer                                                                                                                  | ❌ Lo que NO va a hacer (queda para después)                                                                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Automatizar validaciones de auditoría para procesos de pricing, iniciando con pricing inicial automático en Colombia.                   | No reemplaza completamente el criterio del auditor; los casos con alertas seguirán requiriendo revisión manual.                                        |
| Validar automáticamente reglas técnicas como georreferenciación, uso de Polynator, escalera y calidad de comparables.                   | No automatiza en esta primera fase todos los procesos de pricing como comité, aprobaciones o revisión documental. Estos quedan como fases posteriores. |
| Identificar casos OK y casos con hallazgos mediante reglas de negocio, dejando comentarios accionables para el auditor.                 | No corrige directamente los errores encontrados en los sistemas fuente; solo los detecta y los deja visibles para gestión.                             |
| Ejecutar la auditoría diariamente sobre los casos nuevos de pricing inicial, reduciendo dependencia de muestreo manual.                 | No audita casos históricos de forma masiva en la primera versión, salvo que se defina una carga/backfill específica.                                   |
| Consolidar resultados en una hoja operativa con indicadores binarios, colores y comentarios automáticos.                                | No reemplaza una solución productiva final basada en infraestructura escalable como BigQuery + Python/Cloud Run; eso sería una evolución futura.       |
| Sentar la base para escalar AuditorIA a otros procesos: revisión documental, pricing comité, aprobaciones y demás controles de pricing. | No cubre inicialmente otros países o procesos fuera del alcance definido para pricing inicial Colombia.                                                |

## II. Plan de Ejecución

**Fase 1 — MVP: Pricing Inicial**

Automatizar la auditoría de pricing inicial automático en Colombia, validando reglas clave como georreferenciación, uso de Polynator, escalera y calidad de comparables.

El resultado se consolidará diariamente en una hoja operativa, identificando casos OK y casos que requieren revisión manual.

**Fase 2 — Estabilización y medición**

Monitorear la ejecución diaria de la automatización, ajustar reglas para reducir falsos positivos y medir cobertura, hallazgos y casos que requieren revisión manual.

Esta fase permitirá validar el impacto real frente a la línea base actual de auditoría manual.

**Fase 3 — Escalamiento a otros procesos de pricing**

Extender AuditorIA a otros procesos críticos como revisión documental, pricing comité, aprobaciones y demás controles del flujo de pricing.

El objetivo es construir una capa de auditoría automatizada transversal para todo el proceso.

**Fase 4 — Evolución técnica**

Migrar progresivamente la lógica desde Apps Script/Sheets hacia una arquitectura más escalable, como BigQuery + Python/Cloud Run + Looker Studio, para soportar mayor volumen, trazabilidad histórica y monitoreo continuo.

### 5. Cómo va a funcionar la solución

#### 5.1 Descripción

AuditorIA revisa automáticamente los casos de pricing y detecta posibles inconsistencias antes de que el auditor entre al detalle. La solución clasifica los casos como correctos o con alertas, dejando comentarios accionables para enfocar la revisión manual solo donde hay riesgo.

#### 5.2 Diagrama de flujo de negocio

### 6. Plan de Ejecución por Milestones

[Un milestone es una entrega/iteración de principio a fin que se puede **construir, probar y poner en uso de forma independiente**. No son fases técnicas (no hagas "M1 = construir todo, M2 = probar todo, M3 = liberar todo"). Cada milestone debe dejar algo funcionando, aunque sea para pocos usuarios o pocos casos.]

#### 6.1 Cómo voy a partir el trabajo

- La versión más simple que ya sirve es automatizar de punta a punta la auditoría de pricing inicial automático en Colombia, validando casos nuevos cada día y marcando cuáles están OK y cuáles requieren revisión manual.
- Luego se enriquecerá incorporando más reglas, mejor manejo de excepciones y nuevos procesos de pricing como revisión de documentos, pricing comité y aprobaciones. El proyecto se considera cerrado en su primera etapa cuando se logre medir y alcanzar una cobertura automatizada del 90% al 100% de pricing inicial.

#### 6.2 Tabla de Milestones

| Milestone<br>Síntesis (3-6 palabras) | Deadline<br>Estimación de la fecha de entrega. | Objetivo<br>¿Qué problema o porción del problema resuelve este milestone? (1-2 líneas) | Entregable<br>¿Qué queda funcionando en producción o disponible para el usuario cuando este milestone cierra? Debe ser observable, no abstracto. | Cómo contribuye<br>¿Cómo aporta al KPI, al usuario, al proceso o al negocio? Puede ser uno o varios. | Dependencias<br>Milestones previos, sistemas externos, decisiones de otros equipos. |
| ------------------------------------ | ---------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| M1: MVP Auditoría Pricing Inicial | 6 jun 2026 | Resolver la baja cobertura manual en pricing inicial creando una primera versión que revise automáticamente los casos nuevos y marque cuáles están OK y cuáles tienen alertas. | Automatización funcionando de punta a punta para pricing inicial en Colombia, con validación diaria de georreferenciación, Polynator, escalera y comparables, resultados cargados en la hoja de auditoría y comentarios automáticos. | KPI: empieza a mover la cobertura automatizada de auditoría. Usuario: el auditor deja de revisar desde cero y recibe casos preclasificados. Proceso: reduce tiempo operativo y crea la primera capa de control diario. | Acceso a BigQuery, definición de reglas de negocio, disponibilidad de datos fuente, hoja de control y permisos de Apps Script. |
| M2: Estabilización y adopción operativa | 20 jun 2026 | Resolver errores, falsos positivos y fricciones operativas para que la automatización sea confiable y usable todos los días por el equipo. | Reglas ajustadas y estabilizadas, trigger diario activo, manejo de comentarios más preciso, validación afinada de comparables (menos falsos positivos) y operación diaria en uso por el equipo. | KPI: aumenta consistencia y confiabilidad de la cobertura automatizada. Usuario: el auditor revisa menos casos innecesarios y se enfoca en hallazgos reales. Proceso: disminuye retrabajo y hace sostenible la ejecución diaria. | Retroalimentación del equipo auditor, validación de resultados, ajuste de reglas según hallazgos reales, seguimiento de incidencias operativas. |
| M3: Cobertura objetivo en pricing inicial | 18 jul 2026 | Resolver la brecha de cobertura de auditoría en pricing inicial, asegurando que la automatización permita revisar sistemáticamente la mayoría de los casos y medir su impacto. | Proceso estable de auditoría automática para pricing inicial, con medición de cobertura, trazabilidad de hallazgos y evidencia de operación continua sobre los casos diarios. | KPI: permite medir y alcanzar la meta de 90%-100% de cobertura automatizada en pricing inicial. Usuario: el auditor entra solo a los casos con alertas. Proceso: convierte la auditoría de pricing inicial en un control continuo y escalable. | Estabilidad del flujo diario, disponibilidad continua de datos, seguimiento de métricas, validación del equipo sobre cobertura y calidad de resultados. |
