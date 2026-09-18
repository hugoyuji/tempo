## 🎯 Contexto

Esse foi um projeto despretensioso que surgiu a partir de uma necessidade com a qual eu e alguns amigos nos deparamos. Um hábito muito comum, que se familiarizou entre nós, foi o de assistir a vídeos, especialmente aulas, em velocidades mais altas. No entanto, esse costume fez com que eu enxergasse dois pontos conflitantes: nem todas as plataformas, como os sites da faculdade, ofereciam players de multimídia com suporte para velocidades mais altas, e a resolução clara para isso seria, justamente, através das extensões. Contudo, tanto eu quanto eles sentíamos a mesma coisa — parecia que as extensões não eram seguras ou transparentes o suficiente. Era como fazer uso de algo que poderia, a qualquer momento, acessar algum dado sensível seu, e não haveria muito como controlar.

Tendo em mãos o maior incentivo que poderia cair em meus braços, um pingo da necessidade por algo que eu e meus amigos poderiam desfrutar com maior conforto, inclusive no sentido de adaptar a extensão e podendo adicionar funcionalidades personalizadas, eu decidi desenvolver e deixar essa extensão de código aberto (*open-source*), transparente e focada em privacidade. Ela não pede permissões intrusivas e permite que qualquer um valide o código, utilize com segurança e até contribua com melhorias.

## ✨ Funcionalidades

* **Suporte a Plataformas:** Plataformas de streaming como Amazon Prime Video não oferecem nativamente o suporte para controle de velocidade, além de oferecer controle personalizado para plataformas que já possuem esse controle, mas que engessam as opções (pulando de 1.0x direto para 1.5x, sem meio-termo).
* **Injeção Transparente:** O painel flutuante se sobrepõe ao player de vídeo sem quebrar a interface nativa (mesmo quando o vídeo é pausado).
* **Painel Arrastável (Drag & Drop):** Posicione o controlador em qualquer lugar da tela para não atrapalhar as legendas ou elementos importantes.
* **Modo Claro/Escuro Automático:** A interface do controlador se adapta automaticamente ao tema do seu sistema operacional.
* **Auto-hide Inteligente:** O painel desaparece após 3 segundos de inatividade para uma visualização limpa, reaparecendo instantaneamente ao mover o mouse.

## 🛠️ Como Instalar

Como a extensão é focada em transparência e código aberto, a instalação via repositório garante que você está rodando exatamente o código que está vendo.

1. Faça o download deste projeto clicando no botão **Code > Download ZIP** no GitHub (ou clone via Git).
2. Extraia o arquivo `.zip` em uma pasta no seu computador.
3. Abra o seu navegador e entre na aba de extensões, como ao digitar na barra de endereços do Chrome: `chrome://extensions/`.
4. No canto superior direito da tela, ative a chave **Modo do desenvolvedor**.
5. No canto superior esquerdo, clique no botão **Carregar sem compactação** (ou *Load unpacked*).
6. Selecione a pasta onde você extraiu os arquivos do projeto. Pronto! A extensão já está ativa e segura para uso.

**Para que a extensão funcione de forma adequada, é importante que se você extraiu o arquivo zipado, provavelmente você terá que abrir a pasta de dentro dele durante a seleção. Caso contrário, um erro poderá apontar a falha no reconhecimento do arquivo `manifest.json`.**

## ▶️ Como Usar

**Atalhos de Teclado:**

Você pode segurar os botões para aumentar ou diminuir mais rápido.

* `H` - Alterna a visibilidade da extensão (Liga/Desliga o painel).
* `A` - Reduz a velocidade do vídeo em `-0.10x`.
* `D` - Aumenta a velocidade do vídeo em `+0.10x`.

**Controles Manuais (Mouse):**
* Clique no botão **`+`** ou **`-`** para ajustes finos de velocidade.
* Clique no botão **`»`** para avançar o vídeo em 10 segundos.
* Clique no botão **`«`** para retroceder o vídeo em 10 segundos.
* Clique e segure entre os botões para **arrastar o painel** livremente pela tela.

## 🚀 Tecnologias Utilizadas

<div align="left">

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Manifest_V3-Chrome_API-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)

</div>