# MegaMente Brain Dashboard

Um dashboard 3D interativo baseado em grafos (Force Graph 3D) para visualizar as memórias e o fluxo de dados do sistema MegaMente.

## Como instalar

A maneira mais fácil de instalar todas as dependências é a partir da raiz do projeto MegaMente executando:

```bash
npm run install:all
```

Ou, se preferir instalar apenas o dashboard manualmente:
```bash
cd brain-dashboard/backend
npm install
cd ../frontend
npm install
```

## Como rodar o Dashboard

A partir da raiz do repositório `MegaMente`, você pode rodar tanto o servidor Backend quanto o Frontend simultaneamente com um único comando:

```bash
npm run dashboard
```

Isso fará o seguinte:
1. Iniciará o **Backend** (Node.js/Express) na porta `3001`.
2. Iniciará o **Frontend** (React/Vite) na porta `5173` (ou a próxima disponível como 5174).

Para acessar, abra o navegador e acesse a URL exibida no terminal pelo Vite, geralmente:
`http://localhost:5173` ou `http://localhost:5174`

## Banco de Dados
O dashboard agora utiliza uma pasta global no seu sistema operacional para salvar o banco de dados.
Ele ficará localizado em: `C:\Users\SEU_USUARIO\.Megamente\global_memory.db`
Isso permite que você delete a pasta local do projeto e clone novamente sem perder seus dados, além de permitir que outras IAs e scripts leiam o mesmo banco.
