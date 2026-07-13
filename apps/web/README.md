# React + TypeScript + Vite

## Google Maps Setup (Local e Rede)

Este app usa Google Maps na tela de mapa e depende da variavel `VITE_GOOGLE_MAPS_API_KEY`.

1. Edite o arquivo `.env.local` deste projeto (`apps/web/.env.local`) e preencha:

```env
VITE_GOOGLE_MAPS_API_KEY=SUA_CHAVE_GOOGLE_MAPS
```

2. No Google Cloud Console:
- Ative a API `Maps JavaScript API`.
- Em `Credentials`, abra a chave e configure `Application restrictions` como `HTTP referrers`.
- Inclua os referrers abaixo (ajuste o IP da sua rede quando necessario):

```text
http://localhost:5173/*
https://localhost:5174/*
http://192.168.15.7:5173/*
https://192.168.15.7:5174/*
```

3. Em `API restrictions`, limite a chave para `Maps JavaScript API`.

4. Reinicie o front-end apos alterar o `.env.local`.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
