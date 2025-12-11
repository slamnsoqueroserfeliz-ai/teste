// --- 1. Configurações e Dados do Jogo ---

const teams = [
    { id: 'san', name: 'Santos', year: 2012, color: 'white', secondaryColor: 'black', players: ['Neymar', 'Ganso', 'Borges'], stats: { att: 90, mid: 85, def: 80 } },
    { id: 'fla', name: 'Flamengo', year: 2019, color: 'red', secondaryColor: 'black', players: ['Gabigol', 'B. Henrique', 'Arrascaeta'], stats: { att: 92, mid: 88, def: 82 } },
    { id: 'vas', name: 'Vasco', year: 1998, color: 'white', secondaryColor: 'black', players: ['Edmundo', 'Juninho P.', 'Luizão'], stats: { att: 88, mid: 85, def: 85 } },
    { id: 'int', name: 'Internacional', year: 2005, color: 'red', secondaryColor: 'white', players: ['Fernandão', 'Tinga', 'Sóbis'], stats: { att: 85, mid: 82, def: 88 } },
    { id: 'gre', name: 'Grêmio', year: 1998, color: 'blue', secondaryColor: 'black', players: ['Zinho', 'P. Nunes', 'Jardel'], stats: { att: 86, mid: 84, def: 86 } },
    { id: 'cor', name: 'Corinthians', year: 2012, color: 'white', secondaryColor: 'black', players: ['Sheik', 'Danilo', 'Paulinho'], stats: { att: 82, mid: 88, def: 90 } },
    { id: 'pal', name: 'Palmeiras', year: 2020, color: 'green', secondaryColor: 'white', players: ['Dudu', 'Rony', 'Veiga'], stats: { att: 87, mid: 85, def: 84 } },
];

// Variáveis de Estado
let selectedTeam = null;
let opponentTeam = null;
let scoreHome = 0;
let scoreAway = 0;

// Referências DOM
const startScreen = document.getElementById('start-screen');
const teamSelectionScreen = document.getElementById('team-selection-screen');
const gameScreen = document.getElementById('game-screen');
const resultScreen = document.getElementById('result-screen');
const chooseTeamBtn = document.getElementById('choose-team-btn');
const startGameBtn = document.getElementById('start-game-btn');
const backToMenuBtn = document.getElementById('back-to-menu-btn');
const confirmSelectionBtn = document.getElementById('confirm-selection-btn');
const teamListDiv = document.getElementById('team-list');
const selectedTeamDisplay = document.getElementById('selected-team-display');
const opponentTeamDisplay = document.getElementById('opponent-team-display');
const scoreboard = document.getElementById('scoreboard');
const resultDisplay = document.getElementById('match-result');
const rematchBtn = document.getElementById('rematch-btn');
const backToMainMenuBtn = document.getElementById('back-to-main-menu-btn');

// Canvas
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
let GAME_WIDTH = 400; // Será ajustado
let GAME_HEIGHT = 600; // Será ajustado

// Objetos do Jogo
const gameObjects = {
    ball: { x: 0, y: 0, radius: 5, vx: 0, vy: 0, color: 'white' },
    players: [] // Armazenará os jogadores
};

// --- 2. Funções de Navegação de Tela ---

function showScreen(screen) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    screen.classList.add('active');
}

function goToMenu() {
    selectedTeam = null;
    opponentTeam = null;
    startGameBtn.disabled = true;
    startGameBtn.textContent = 'Jogar (Selecione o time primeiro)';
    showScreen(startScreen);
    stopGameLoop();
    document.getElementById('crowd-sound').pause();
}

function goToTeamSelection() {
    renderTeamCards();
    showScreen(teamSelectionScreen);
}

function startGame() {
    if (!selectedTeam || !opponentTeam) {
        alert('Selecione os times antes de começar!');
        return;
    }

    // Inicialização do Jogo
    scoreHome = 0;
    scoreAway = 0;
    updateScoreboard();
    initializeGameObjects();
    resizeCanvas();
    showScreen(gameScreen);
    document.getElementById('crowd-sound').play().catch(e => console.log('Áudio de torcida bloqueado.')); // Tentar tocar som
    startGameLoop();
}

function endGame() {
    stopGameLoop();
    document.getElementById('crowd-sound').pause();

    let resultText = '';
    if (scoreHome > scoreAway) {
        resultText = `${selectedTeam.name} VENCEU! (${scoreHome} - ${scoreAway})`;
    } else if (scoreAway > scoreHome) {
        resultText = `${opponentTeam.name} VENCEU! (${scoreHome} - ${scoreAway})`;
    } else {
        resultText = `EMPATE (${scoreHome} - ${scoreAway})`;
    }
    resultDisplay.textContent = resultText;
    showScreen(resultScreen);
}

// --- 3. Lógica de Seleção de Times ---

function renderTeamCards() {
    teamListDiv.innerHTML = '';
    teams.forEach(team => {
        const card = document.createElement('div');
        card.className = 'team-card';
        card.dataset.teamId = team.id;
        card.innerHTML = `
            <h4>${team.name}</h4>
            <p>⚽️ ${team.year}</p>
            <p>ATT: ${team.stats.att} | DEF: ${team.stats.def}</p>
        `;
        card.addEventListener('click', () => selectTeam(team));
        teamListDiv.appendChild(card);
    });
}

function selectTeam(team) {
    selectedTeam = team;

    // 1. Destaque do Card
    document.querySelectorAll('.team-card').forEach(card => card.classList.remove('selected'));
    document.querySelector(`.team-card[data-team-id="${team.id}"]`).classList.add('selected');

    // 2. Escolher Adversário Aleatório
    const availableOpponents = teams.filter(t => t.id !== team.id);
    const randomIndex = Math.floor(Math.random() * availableOpponents.length);
    opponentTeam = availableOpponents[randomIndex];

    // 3. Atualizar Infos
    selectedTeamDisplay.textContent = `Time Escolhido: ${selectedTeam.name} (${selectedTeam.year})`;
    opponentTeamDisplay.textContent = `Adversário: ${opponentTeam.name} (${opponentTeam.year})`;

    // 4. Ativar Botões
    confirmSelectionBtn.disabled = false;
    startGameBtn.disabled = false;
    startGameBtn.textContent = `Jogar com ${selectedTeam.name} contra ${opponentTeam.name}`;
}

// --- 4. Lógica e Renderização do Jogo (O CORE) ---

function resizeCanvas() {
    // Tenta usar o máximo do espaço disponível, mantendo uma proporção de campo (ex: 2:3)
    const container = gameScreen.getBoundingClientRect();
    const ratio = 2 / 3; // Proporção do campo (Largura / Altura)

    let newWidth = Math.min(container.width - 40, 600); // 40px de padding
    let newHeight = newWidth / ratio;

    if (newHeight > container.height - 100) { // 100px para o placar e margem
        newHeight = container.height - 100;
        newWidth = newHeight * ratio;
    }

    GAME_WIDTH = canvas.width = newWidth;
    GAME_HEIGHT = canvas.height = newHeight;

    // Reposiciona os objetos do jogo após o resize
    initializeGameObjects(true);
}

window.addEventListener('resize', resizeCanvas);


function initializeGameObjects(isResize = false) {
    // Posições baseadas em porcentagem do campo para serem responsivas
    const center = { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 };

    // Reposiciona a bola no centro
    gameObjects.ball.x = center.x;
    gameObjects.ball.y = center.y;
    gameObjects.ball.vx = 0;
    gameObjects.ball.vy = 0;

    // Cria/Reposiciona os jogadores (simplificado para 3v3 ou 5v5 para este exemplo)
    if (!isResize) {
        gameObjects.players = [];
    }
    
    // Posições Iniciais (Exemplo de um 3x3 simples Top-Down)
    const positions = [
        // Time da casa (bottom)
        { x: center.x, y: GAME_HEIGHT * 0.75, team: 'home' }, // Defesa/Meio
        { x: center.x - GAME_WIDTH * 0.1, y: GAME_HEIGHT * 0.85, team: 'home' }, // Atacante 1
        { x: center.x + GAME_WIDTH * 0.1, y: GAME_HEIGHT * 0.85, team: 'home' }, // Atacante 2

        // Time de Fora (top)
        { x: center.x, y: GAME_HEIGHT * 0.25, team: 'away' }, // Defesa/Meio
        { x: center.x - GAME_WIDTH * 0.1, y: GAME_HEIGHT * 0.15, team: 'away' }, // Atacante 1
        { x: center.x + GAME_WIDTH * 0.1, y: GAME_HEIGHT * 0.15, team: 'away' } // Atacante 2
    ];

    // Se estiver apenas redimensionando, apenas atualize as posições X/Y
    if (isResize) {
         // Lógica mais complexa seria necessária, mas para simplificar, apenas reinicializa
         initializeGameObjects(false);
         return;
    }

    // Inicializa novos jogadores
    positions.forEach((pos, index) => {
        gameObjects.players.push({
            x: pos.x,
            y: pos.y,
            originalX: pos.x,
            originalY: pos.y,
            radius: 8,
            color: pos.team === 'home' ? selectedTeam.color : opponentTeam.color,
            team: pos.team,
            isGoalie: index === 0 || index === 3, // O primeiro de cada time é o "goleiro"
            vx: 0, vy: 0,
            speed: 2 + (pos.team === 'home' ? selectedTeam.stats.mid : opponentTeam.stats.mid) / 100 // Exemplo de uso de atributo
        });
    });
}

function updateScoreboard() {
    document.getElementById('score-home').textContent = scoreHome;
    document.getElementById('score-away').textContent = scoreAway;
}

function drawField() {
    // O canvas já tem a cor de fundo 'var(--field-color)'
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;

    // Linhas Laterais e de Fundo (já definidas pelo tamanho do canvas)
    // Linha de Meio
    ctx.beginPath();
    ctx.moveTo(0, GAME_HEIGHT / 2);
    ctx.lineTo(GAME_WIDTH, GAME_HEIGHT / 2);
    ctx.stroke();

    // Círculo Central
    ctx.beginPath();
    ctx.arc(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH * 0.1, 0, Math.PI * 2);
    ctx.stroke();

    // Gols e Áreas (simplificados)
    const goalWidth = GAME_WIDTH * 0.2;
    const goalDepth = 10;

    // Área de Cima (Time Away)
    ctx.strokeRect(GAME_WIDTH / 2 - goalWidth / 2, 0, goalWidth, goalDepth);
    // Área de Baixo (Time Home)
    ctx.strokeRect(GAME_WIDTH / 2 - goalWidth / 2, GAME_HEIGHT - goalDepth, goalWidth, goalDepth);
}

function drawBall() {
    const ball = gameObjects.ball;
    ctx.fillStyle = ball.color;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
}

function drawPlayers() {
    gameObjects.players.forEach(player => {
        ctx.fillStyle = player.color;
        ctx.strokeStyle = player.team === 'home' ? selectedTeam.secondaryColor : opponentTeam.secondaryColor;
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Indicar o jogador ativo (o que o usuário controla) - Lógica de controle a ser implementada
        if (player.activeControl) {
            ctx.strokeStyle = 'yellow';
            ctx.lineWidth = 3;
            ctx.stroke();
        }
    });
}

function updatePhysics() {
    const ball = gameObjects.ball;

    // 1. Driblar/Controlar (Lógica de controle simples - Pega o jogador mais próximo da bola)
    let activePlayer = null;
    let minDistance = Infinity;
    gameObjects.players.forEach(player => {
        const dist = Math.sqrt(Math.pow(ball.x - player.x, 2) + Math.pow(ball.y - player.y, 2));
        if (dist < minDistance) {
            minDistance = dist;
            activePlayer = player;
        }
        player.activeControl = false; // Reset
    });

    if (activePlayer && minDistance < 15) { // Se a bola estiver perto de um jogador
        activePlayer.activeControl = true;
        // Simplesmente move a bola com o jogador se estiver sob controle (drible)
        // A lógica de INPUT para mover o jogador é o próximo passo
        // Por enquanto, a IA simples tentará levar a bola para o gol adversário
        
        // Exemplo de IA simples (Move o jogador e a bola na direção do gol)
        const targetY = activePlayer.team === 'home' ? GAME_HEIGHT * 0.05 : GAME_HEIGHT * 0.95;
        const targetX = GAME_WIDTH / 2;

        const dx = targetX - activePlayer.x;
        const dy = targetY - activePlayer.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 1) {
             activePlayer.vx = (dx / dist) * activePlayer.speed * 0.5; // Movimento suave
             activePlayer.vy = (dy / dist) * activePlayer.speed * 0.5;
        } else {
             activePlayer.vx = 0;
             activePlayer.vy = 0;
        }
       

        // Move o jogador
        activePlayer.x += activePlayer.vx;
        activePlayer.y += activePlayer.vy;

        // Move a bola com o jogador
        ball.x = activePlayer.x + activePlayer.vx; 
        ball.y = activePlayer.y + activePlayer.vy;
        ball.vx = activePlayer.vx;
        ball.vy = activePlayer.vy;

    } else {
         // 2. Movimento da Bola (Atrito/Desaceleração)
         ball.x += ball.vx;
         ball.y += ball.vy;
         ball.vx *= 0.99; // Atrito
         ball.vy *= 0.99; // Atrito
    }
    
    // 3. Colisões de Borda
    if (ball.x < ball.radius || ball.x > GAME_WIDTH - ball.radius) {
        ball.vx *= -0.8; // Quica
        ball.x = Math.max(ball.radius, Math.min(GAME_WIDTH - ball.radius, ball.x));
    }
    if (ball.y < ball.radius || ball.y > GAME_HEIGHT - ball.radius) {
        ball.vy *= -0.8; // Quica
        ball.y = Math.max(ball.radius, Math.min(GAME_HEIGHT - ball.radius, ball.y));
    }
    
    // 4. Gol
    const goalWidth = GAME_WIDTH * 0.2;
    const isInsideGoal = (ball.x > GAME_WIDTH / 2 - goalWidth / 2 && ball.x < GAME_WIDTH / 2 + goalWidth / 2);

    if (isInsideGoal) {
        if (ball.y < 0) {
            scoreHome++;
            handleGoal('home'); // Time da casa pontua (Gol no gol de cima)
        } else if (ball.y > GAME_HEIGHT) {
            scoreAway++;
            handleGoal('away'); // Time de fora pontua (Gol no gol de baixo)
        }
    }
    
    // 5. Limite de Tempo (A partida dura 30 segundos)
    if (Date.now() - startTime > 30000) { 
        endGame();
    }
}

function handleGoal(scoringTeam) {
    updateScoreboard();
    document.getElementById('goal-sound').play();
    console.log(`GOOOOL! ${scoringTeam === 'home' ? selectedTeam.name : opponentTeam.name} pontuou!`);
    
    // Reinicia a bola no centro
    initializeGameObjects();
    
    // Verifica se atingiu um limite de gols ou fim de tempo (aqui estamos usando só tempo)
    // if (scoreHome === 5 || scoreAway === 5) { endGame(); } 
}

// --- 5. Game Loop ---

let gameLoopId = null;
let lastTime = 0;
let startTime = 0;

function gameLoop(currentTime) {
    if (!startTime) startTime = currentTime;
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    // Limpa o canvas
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // 1. Desenha o Campo
    drawField();

    // 2. Atualiza Posições e Física
    updatePhysics(deltaTime);

    // 3. Desenha Jogadores e Bola
    drawPlayers();
    drawBall();

    gameLoopId = requestAnimationFrame(gameLoop);
}

function startGameLoop() {
    if (gameLoopId) stopGameLoop();
    startTime = Date.now();
    gameLoopId = requestAnimationFrame(gameLoop);
}

function stopGameLoop() {
    if (gameLoopId) {
        cancelAnimationFrame(gameLoopId);
        gameLoopId = null;
    }
}


// --- 6. Event Listeners ---

chooseTeamBtn.addEventListener('click', goToTeamSelection);
backToMenuBtn.addEventListener('click', goToMenu);

confirmSelectionBtn.addEventListener('click', () => {
    // Retorna para o menu principal, mas com o botão "Jogar" habilitado
    startGameBtn.disabled = false;
    showScreen(startScreen);
});

startGameBtn.addEventListener('click', startGame);

rematchBtn.addEventListener('click', startGame);
backToMainMenuBtn.addEventListener('click', goToMenu);

// Eventos de Toque/Mouse para Controle (Passar/Chutar/Driblar)

canvas.addEventListener('mousedown', handleInput);
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Evita o scroll/zoom padrão do celular
    handleInput(e.touches[0]);
});

function handleInput(e) {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const activePlayer = gameObjects.players.find(p => p.activeControl);
    
    if (activePlayer) {
        // Lógica de "Chute" (passa a bola na direção do clique/toque)
        const ball = gameObjects.ball;
        const dx = clickX - ball.x;
        const dy = clickY - ball.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Força do chute (ajustável)
        const kickPower = 15; 
        
        ball.vx = (dx / distance) * kickPower;
        ball.vy = (dy / distance) * kickPower;

        // O jogador para de ser o controlador imediato
        activePlayer.activeControl = false;
    } else {
        // Lógica de "Movimentar Jogador"
        // Move o jogador MAIS PRÓXIMO do clique/toque (que não é o goleiro) para a posição clicada
        // Esta é a parte complexa de controle Top-Down que precisaria de mais refinamento.
    }
}

// Inicializa o jogo na tela principal
goToMenu();
resizeCanvas(); // Garante o tamanho correto na inicializaçãofunction drawPlayers() {
    gameObjects.players.forEach(player => {
        // ... (código existente de desenho do círculo) ...
        
        ctx.fillStyle = player.color;
        ctx.strokeStyle = player.team === 'home' ? selectedTeam.secondaryColor : opponentTeam.secondaryColor;
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // DESTAQUE VISUAL PARA O CRAQUE
        if (player.isUserControlled) {
            ctx.strokeStyle = '#FFD700'; // Dourado
            ctx.lineWidth = 4;
            ctx.stroke();
            
            // Desenhar o nome do jogador (simulando "se parecer")
            ctx.fillStyle = '#FFD700'; 
            ctx.font = "8px Arial";
            ctx.fillText(selectedTeam.starPlayer, player.x - 15, player.y - 15);
        }
        // ... (fim do loop)
    });
}
