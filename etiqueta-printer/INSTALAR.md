# Instalação — FourTEX Impressora de Etiquetas

## O que precisa no computador da impressora

1. **Node.js** — baixar em https://nodejs.org (versão LTS)
   - Instalar normalmente, Next → Next → Finish

2. **A pasta `etiqueta-printer`** — copiar via pendrive ou WhatsApp

## Como usar

1. Copie a pasta `etiqueta-printer` para o Desktop do computador
2. Abra a pasta e dê **dois cliques em `INICIAR.bat`**
3. Pronto — deixe a janela aberta, ela imprime automaticamente

## Verificar nome da impressora (se não imprimir)

1. Abra: Painel de Controle → Dispositivos e Impressoras
2. Veja o nome exato da Elgin L42
3. Abra o arquivo `index.js` com o Bloco de Notas
4. Encontre a linha: `const NOME_IMPRESSORA = "Elgin L42";`
5. Substitua pelo nome exato e salve

## Para iniciar automaticamente com o Windows

1. Pressione `Win + R`, digite `shell:startup`, Enter
2. Copie o arquivo `INICIAR.bat` para essa pasta
3. Pronto — vai iniciar sozinho quando ligar o computador
