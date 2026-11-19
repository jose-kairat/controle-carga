# Controle de Carga — Kairat Futsal

App de questionário diário de carga/bem-estar (pré e pós-treino) para os atletas, com painel
de acompanhamento para a comissão técnica (ACWR, monotonia, strain). Português/Russo.

- `public/index.html` — frontend (single page, PT/RU, sem dependências além de Chart.js e Google Fonts via CDN).
- `functions/api/*.js` — Cloudflare Pages Functions (backend serverless).
- `schema.sql` — schema do banco de dados (Cloudflare D1 / SQLite).

Hospedado na Cloudflare Pages, conectado a este repositório — cada push republica automaticamente,
sem link fixo ("pin") para atualizar manualmente.

## Relatório semanal (comissão)

No painel da comissão, o botão **Relatório semanal** abre uma tela com:

- alertas automáticos (ACWR, queda/alta de carga, dor persistente, sono baixo, atletas sem resposta);
- carga da equipe por semana (gráfico e tabela, semanas de segunda a domingo);
- tabela por atleta: carga por semana, Δ%, ACWR, monotonia, strain, bem-estar, dias com dor, PSE médio e sessões;
- período de 4, 6 ou 8 semanas;
- **Imprimir / salvar PDF** (layout próprio de impressão, A4 paisagem) e exportação **CSV semanal** e **CSV diário** (separador `;`, abre direto no Excel).

Tudo é calculado no navegador a partir de `/api/state`; não exige mudança no banco nem nas funções.
