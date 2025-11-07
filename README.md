# 3D Race

Um mini-game de corrida 3D desenvolvido com React, Three.js e React Three Fiber. Controle um carro vermelho em um ambiente aberto, desvie de obstáculos e alcance a linha de chegada no menor tempo possível!

![3D Race Game](https://img.shields.io/badge/Three.js-3D%20Game-000000?style=for-the-badge&logo=three.js)
![React](https://img.shields.io/badge/React-19.2.0-61DAFB?style=for-the-badge&logo=react)
![Next.js](https://img.shields.io/badge/Next.js-16.0.1-000000?style=for-the-badge&logo=next.js)

## 🎮 Demo

🎮 **[Jogue Agora](https://3d-race.netlify.app/)** 🎮

O jogo está disponível online! Acesse o link acima para jogar diretamente no navegador.

## 🎮 Sobre o Projeto

Este projeto é uma experiência de aprendizado com Three.js e desenvolvimento de jogos 3D no navegador. O jogo apresenta um carro controlável em um ambiente 3D com física realista, obstáculos variados e um sistema de câmera em terceira pessoa.

## ✨ Funcionalidades

- 🚗 **Carro Controlável**: Controle total com teclado (WASD ou setas)
- 🎯 **Obstáculos Variados**: Árvores, pedras e muros espalhados pela pista
- 🏁 **Sistema de Chegada**: Linha de chegada com detecção automática
- 📊 **HUD Completo**: Tempo, velocidade e status em tempo real
- 🎥 **Câmera Dinâmica**: Segue o carro em terceira pessoa com suavização
- ⚡ **Física Realista**: Gravidade, colisões e movimento fluido
- 🎨 **Visual Estilo Bruno Simon**: Design low-poly minimalista

## 🛠️ Tecnologias Utilizadas

### Core
- **React 19.2.0** - Framework UI
- **Next.js 16.0.1** - Framework React com SSR
- **TypeScript** - Tipagem estática

### 3D & Física
- **Three.js 0.181.0** - Biblioteca 3D para WebGL
- **@react-three/fiber 9.4.0** - Renderizador React para Three.js
- **@react-three/drei 10.7.6** - Helpers e utilitários para R3F
- **@react-three/rapier 2.2.0** - Motor de física e colisões

### Estilização
- **Tailwind CSS 4** - Framework CSS utility-first

## 🎮 Controles

| Tecla | Ação |
|-------|------|
| **W** ou **↑** | Acelerar |
| **S** ou **↓** | Ré |
| **A** ou **←** | Virar à esquerda |
| **D** ou **→** | Virar à direita |
| **Espaço** | Frear |

> ⚠️ **Nota**: Por enquanto, o jogo está disponível apenas para computador. O controle mobile ainda não está implementado.

## 🏗️ Estrutura do Projeto

```
my-3d-race/
├── app/
│   ├── components/
│   │   ├── Car.tsx           # Componente do carro com física
│   │   ├── CameraRig.tsx      # Sistema de câmera em terceira pessoa
│   │   ├── Track.tsx         # Pista e chão
│   │   ├── Obstacles.tsx     # Árvores, pedras e muros
│   │   ├── FinishLine.tsx    # Linha de chegada
│   │   ├── GameCanvas.tsx    # Canvas principal e configuração 3D
│   │   └── types.ts          # Tipos TypeScript
│   ├── page.tsx              # Página principal e lógica do jogo
│   └── layout.tsx            # Layout da aplicação
├── public/                   # Arquivos estáticos
└── package.json             # Dependências do projeto
```

## 📦 Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/my-3d-race.git
cd my-3d-race
```

2. Instale as dependências:
```bash
npm install
```

3. Execute o servidor de desenvolvimento:
```bash
npm run dev
```

4. Abra [http://localhost:3000](http://localhost:3000) no navegador
