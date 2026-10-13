# FourTEX — Sistema de Controle de Produção Têxtil

Sistema web que desenvolvi sozinho para a FourTEX, indústria têxtil de fitas, elásticos, cordões, viés e TNT. Ele é usado diariamente pela produção, pelo estoque e pelo comercial da empresa.

> Esta é a versão de portfólio: dados reais da empresa (usuários, credenciais e códigos de clientes) foram removidos.

## O que o sistema faz

- **Produção por turno:** apontamentos nos 3 turnos (06h–14h, 14h–22h, 22h–06h), fechamento de turno e controle de defeitos.
- **Pedidos e prazos:** cálculo de entrega em dias úteis (feriados excluídos), com base na capacidade de cada máquina, e alertas de pedidos próximos do prazo.
- **Estoque:** produto acabado e matéria-prima. Cada apontamento dá baixa automática do fio consumido.
- **Planejamento e metas:** previsão de fio necessário por pedido, custo de fio e dashboard com indicadores.
- **Etiquetas automáticas:** um serviço em Node.js (`etiqueta-printer/`) monitora uma fila no Firebase e imprime em impressora térmica Elgin.
- **Controle de acesso:** perfis (administrador, operador, apontador, mecânico, comercial…) com permissões por tela e separação entre visualizar e editar. Senhas guardadas apenas como hash SHA-256, com migração automática de contas antigas no primeiro login.
- **Relatórios:** exportação em CSV e PDF.
- **PWA:** instalável no celular, compatível com aparelhos antigos (Android 6+, iOS 12+) e com atualização automática de versão.

## Tecnologias

React 18 · Vite · Tailwind CSS · Firebase (Realtime Database, Authentication, Hosting) · Node.js · PWA · Sentry

## Rodando localmente

```bash
npm install
cp .env.example .env   # preencha com os dados do seu projeto Firebase
npm run dev
```

Usuários de demonstração: `admin` / `demo` e `operador` / `demo`.

## Próximos passos

- Migrar o login para o Firebase Authentication (e-mail e senha), validando o acesso no servidor.
- Dividir os componentes maiores em partes menores e adicionar testes automatizados.

## Autor

Renan Rocha · [github.com/renantv1](https://github.com/renantv1)
