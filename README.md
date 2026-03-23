# Backend Challenge — Golden Raspberry Awards API

API RESTful para leitura da lista de indicados e vencedores da categoria **Pior Filme** do Golden Raspberry Awards.

## Tecnologias

- **Node.js** + **TypeScript**
- **Fastify** — framework HTTP
- **better-sqlite3** — banco de dados em memória (SQLite)
- **csv-parse** — parser de CSV
- **Jest** + **SWC** — testes de integração

## Pré-requisitos

- **Node.js** >= 18
- **npm** >= 9

## Instalação

```bash
git clone <url-do-repositorio>
cd backend-challenge
npm install
```

## Executando a aplicação

### 1. Adicionar o arquivo CSV

Antes de iniciar, é necessário disponibilizar o arquivo de dados em:

```
src/input/movielist.csv
```

O arquivo deve seguir o formato CSV com delimitador `;` (ponto e vírgula) e conter o seguinte cabeçalho:

```
year;title;studios;producers;winner
```

| Coluna      | Tipo   | Descrição                                                           |
| ----------- | ------ | ------------------------------------------------------------------- |
| `year`      | number | Ano do filme                                                        |
| `title`     | string | Título do filme                                                     |
| `studios`   | string | Estúdio(s) responsável(is)                                          |
| `producers` | string | Produtor(es), separados por `, ` ou `and` quando houver mais de um  |
| `winner`    | string | `yes` caso o filme tenha vencido na categoria, vazio caso contrário |

> **Nota:** A aplicação já inclui um arquivo de exemplo em `tests/integration/api/producers/awards-interval/movielist.mock.csv` que pode ser movido para `src/input/movielist.csv`. Caso deseje utilizar outro conjunto de dados, basta substituí-lo mantendo o mesmo nome e formato.

### 2. Iniciar o servidor

```bash
npm install
npm start
```

A aplicação será iniciada na porta `3000` (ou na porta definida pela variável de ambiente `PORT`).

Ao iniciar, o arquivo CSV é automaticamente lido e carregado para o banco de dados em memória (SQLite). Nenhuma instalação de banco de dados externo é necessária.

## Documentação da API

A especificação completa da API está disponível no arquivo [openapi.yml](/docs/openapi.yml) (OpenAPI 3.0).

## Executando os testes

```bash
npm test
```

Os testes de integração:

- Carregam um CSV de mock para o banco em memória
- Fazem requisições HTTP ao endpoint via `app.inject()` do Fastify (sem necessidade de subir o servidor)
- Validam o formato da resposta, a consistência lógica e os valores esperados
- Testam cenários de borda com dados controlados (produtores sem múltiplas vitórias, sem vencedores, parsing de produtores compostos, intervalos consecutivos, empates)

## Estrutura do projeto

```
src/
├── app.ts                          # Factory do Fastify (buildApp)
├── server.ts                       # Entrypoint — inicia o servidor
├── infra/
│   └── database.ts                 # Conexão SQLite em memória (singleton)
├── startup/
│   └── csv-loader.ts               # Leitura e inserção do CSV no banco
├── modules/
│   └── producers/
│       ├── producer.routes.ts      # Rotas do módulo de produtores
│       ├── dtos/
│       │   └── awards-interval.ts  # Interfaces de resposta
│       └── services/
│           └── get-awards-interval.service.ts  # Lógica de negócio
└── input/
    └── movielist.csv               # Dados de entrada (CSV)

tests/
└── integration/
    └── api/
        └── producers/
            └── awards-interval/
                ├── get.spec.ts          # Testes de integração
                └── movielist.mock.csv   # CSV de mock para testes
```
