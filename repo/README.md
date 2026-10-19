# Engenharia Reversa – Sistema Oficina AutoCerta

Repositório da atividade de engenharia reversa do sistema web da oficina mecânica AutoCerta.

## Estrutura

```
├── README.md
├── .gitignore
├── docs/
│   ├── documentacao.pdf      # Documentação completa (itens 1 a 8)
│   ├── der.png               # Diagrama Entidade-Relacionamento
│   └── evidencias/           # Prints e logs dos casos de teste
└── sistema_comentado/        # Código-fonte com comentários explicativos
    ├── server.js
    ├── seguranca.js
    ├── db/
    ├── public/
    └── ...
```

## Como executar o sistema original (para testes)

```bash
cd sistema_comentado   # ou a pasta sistema original
npm install
npm start
# Acesse http://localhost:3000
# Logins: admin/admin123 | ana.mecanica/ana123 | carlos.recepcao/carlos123
```

Requer **Node.js 22.13 ou superior**.

## Entregáveis

1. Requisitos funcionais e regras de negócio
2. DER do banco
3. Mapa da API
4. Mapa do front-end
5. Análise de segurança + 3 melhorias
6. 15+ casos de teste com resultado real
7. Diagrama de fluxo (cadastro de veículo)
8. Código comentado (explica o *porquê*)

Tudo consolidado em `docs/documentacao.pdf`.

## Observações

- O arquivo `oficina_db.sqlite` é gerado automaticamente na primeira execução.
- Não versionar `node_modules` nem o `.sqlite` (já estão no `.gitignore`).
