// Budget Adventure - Main Game Logic
import kaboom from "kaboom";

// Initialize Kaboom
canvas({
    width: 800,
    height: 600,
    letterbox: true
});

// Game state
let gameState = {
    completedTopics: [],
    currentScore: 0,
    topics: [],
    gameStarted: false,
    modalOpen: false
};

// Audio context for synthesized sounds
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    if (type === 'coin') {
        oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    } else if (type === 'correct') {
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
        oscillator.frequency.setValueAtTime(554, audioCtx.currentTime + 0.1);
        oscillator.frequency.setValueAtTime(659, audioCtx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    } else if (type === 'wrong') {
        oscillator.frequency.setValueAtTime(200, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
    }
    
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.3);
}

// Convert hex color to rgb
function hex2rgb(hex) {
    const result = hex.replace(/^#/, '');
    const bigInt = parseInt(result, 16);
    return rgb((bigInt >> 16) & 255, (bigInt >> 8) & 255, bigInt & 255);
}

// Load topics from JSON
async function loadTopics() {
    try {
        const response = await fetch('./data/topics.json');
        gameState.topics = await response.json();
        
        // Load completed topics from localStorage
        const saved = localStorage.getItem('budget_adventure_completed');
        if (saved) {
            gameState.completedTopics = JSON.parse(saved);
        }
    } catch (error) {
        console.error('Error loading topics:', error);
        // Use fallback topics
        gameState.topics = [
            { 
                id: 1, 
                title: "Budget Basics", 
                content: "A budget helps you plan your money! Think of it as a treasure map for where your coins should go.",
                color: "#FFD700", 
                position: { x: 200, y: 150 },
                question: { 
                    text: "If you earn $10 per week and save $3 each week, how much saved in 4 weeks?",
                    options: ["$12", "$15", "$10", "$8"],
                    correct: 0,
                    explanation: "Right! $3 × 4 weeks = $12 saved!"
                }
            },
            {
                id: 2,
                title: "Needs vs Wants",
                content: "Needs are things you must have to live. Wants are nice to have. Budgeters pay for needs first!",
                color: "#FF6B6B",
                position: { x: 600, y: 100 },
                question: {
                    text: "Which is a NEED?",
                    options: ["Video game", "New sneakers", "Food", "Toys"],
                    correct: 2,
                    explanation: "Correct! Food is a need - you need it to live!"
                }
            }
        ];
    }
}

// Create the game world
function createGameWorld() {
    // Create background
    add([
        rect(800, 600),
        pos(0, 0),
        color(0, 100, 0)
    ]);
    // Add decorative trees/obstacles
    for (let i = 0; i < 15; i++) {
        const x = rand(50, 750);
        const y = rand(50, 550);
        if (x > 300 && x < 500 && y > 300 && y < 400) continue;
        
        add([
            circle(20),
            pos(x, y),
            color(0, 80, 0),
            anchor("center"),
            "tree"
        ]);
    }
    
    // Create coins
    gameState.topics.forEach((topic) => {
        const isCompleted = gameState.completedTopics.includes(topic.id);
        
        const coin = add([
            circle(25),
            pos(topic.position.x, topic.position.y),
            color(isCompleted ? rgb(100, 100, 100) : hex2rgb(topic.color)),
            anchor("center"),
            outline(isCompleted ? 2 : 4, rgb(200, 200, 200)),
            "coin",
            { topicId: topic.id, isCompleted: isCompleted }
        ]);
        
        add([
            text(topic.title, { size: 12 }),
            pos(topic.position.x, topic.position.y + 35),
            anchor("center"),
            color(255, 255, 255)
        ]);
        
        if (!isCompleted) {
            loop(1.5, () => {
                if (!gameState.modalOpen) {
                    tween(coin.scale, vec2(1.2, 1.2), 0.3, (p) => coin.scale = p);
                    wait(0.3, () => {
                        tween(coin.scale, vec2(1, 1), 0.3, (p) => coin.scale = p);
                    });
                }
            });
        }
    });
    
    // Create player
    const player = add([
        rect(30, 30),
        pos(400, 300),
        color(50, 100, 200),
        anchor("center"),
        outline(3, rgb(0, 0, 0)),
        "player",
        { speed: 200 }
    ]);
    
    // Movement controls
    onKeyDown("left", () => { if (!gameState.modalOpen) player.move(-player.speed, 0); });
    onKeyDown("a", () => { if (!gameState.modalOpen) player.move(-player.speed, 0); });
    onKeyDown("right", () => { if (!gameState.modalOpen) player.move(player.speed, 0); });
    onKeyDown("d", () => { if (!gameState.modalOpen) player.move(player.speed, 0); });
    onKeyDown("up", () => { if (!gameState.modalOpen) player.move(0, -player.speed); });
    onKeyDown("w", () => { if (!gameState.modalOpen) player.move(0, -player.speed); });
    onKeyDown("down", () => { if (!gameState.modalOpen) player.move(0, player.speed); });
    onKeyDown("s", () => { if (!gameState.modalOpen) player.move(0, player.speed); });
    
    // Check collision with coins
    onUpdate("player", () => {
        if (gameState.modalOpen) return;
        
        get("coin").forEach(coin => {
            if (player.pos.dist(coin.pos) < 50 && !coin.isCompleted) {
                const topic = gameState.topics.find(t => t.id === coin.topicId);
                if (topic) {
                    showQuizModal(topic, () => {
                        gameState.completedTopics.push(topic.id);
                        localStorage.setItem('budget_adventure_completed', 
                            JSON.stringify(gameState.completedTopics));
                        playSound('coin');
                        coin.color = rgb(100, 100, 100);
                        coin.isCompleted = true;
                        destroyAll("coin-text" + coin.topicId);
                        
                        // Check victory
                        if (gameState.completedTopics.length === gameState.topics.length) {
                            showVictoryScreen();
                        }
                    });
                }
            }
        });
    });
    
    // Keep player in bounds
    onUpdate("player", () => {
        player.pos.x = clamp(player.pos.x, 15, 785);
        player.pos.y = clamp(player.pos.y, 15, 585);
    });
}

// Show quiz modal
function showQuizModal(topic, onSuccess) {
    gameState.modalOpen = true;
    
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'quiz-modal';
    
    const content = document.createElement('div');
    content.className = 'modal-content';
    
    const title = document.createElement('h2');
    title.className = 'card-title';
    title.textContent = topic.title;
    
    const cardContent = document.createElement('div');
    cardContent.className = 'card-content';
    cardContent.textContent = topic.content;
    
    const quizSection = document.createElement('div');
    quizSection.className = 'quiz-section';
    
    const question = document.createElement('div');
    question.className = 'quiz-question';
    question.textContent = topic.question.text;
    
    const optionsDiv = document.createElement('div');
    optionsDiv.className = 'quiz-options';
    
    let answered = false;
    
    topic.question.options.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-button';
        btn.textContent = opt;
        btn.onclick = () => {
            if (answered) return;
            answered = true;
            
            if (index === topic.question.correct) {
                btn.classList.add('correct');
                playSound('correct');
                showFeedback(true, topic.question.explanation, content, onSuccess);
            } else {
                btn.classList.add('incorrect');
                playSound('wrong');
                showFeedback(false, 'Not quite! Try reading the card again and think about it.', content, null);
                answered = false; // Allow retry
            }
        };
        optionsDiv.appendChild(btn);
    });
    
    quizSection.appendChild(question);
    quizSection.appendChild(optionsDiv);
    
    content.appendChild(title);
    content.appendChild(cardContent);
    content.appendChild(quizSection);
    overlay.appendChild(content);
    document.body.appendChild(overlay);
}

// Show feedback
function showFeedback(isCorrect, message, contentEl, onSuccess) {
    const existingFeedback = contentEl.querySelector('.feedback');
    if (existingFeedback) existingFeedback.remove();
    
    const feedback = document.createElement('div');
    feedback.className = 'feedback ' + (isCorrect ? 'correct' : 'incorrect');
    feedback.textContent = message;
    contentEl.appendChild(feedback);
    
    if (isCorrect && onSuccess) {
        const closeBtn = document.createElement('button');
        closeBtn.className = 'close-button';
        closeBtn.textContent = 'Collect Coin!';
        closeBtn.style.display = 'block';
        closeBtn.onclick = () => {
            document.getElementById('quiz-modal').remove();
            gameState.modalOpen = false;
            onSuccess();
        };
        contentEl.appendChild(closeBtn);
    } else if (!isCorrect) {
        setTimeout(() => {
            const feedbackEl = contentEl.querySelector('.feedback');
            if (feedbackEl) {
                feedbackEl.remove();
            }
            // Reset all buttons
            contentEl.querySelectorAll('.option-button').forEach(btn => {
                btn.classList.remove('incorrect');
            });
        }, 3000);
    }
}

// Show victory screen
function showVictoryScreen() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    const content = document.createElement('div');
    content.className = 'modal-content victory-screen';
    
    const title = document.createElement('h1');
    title.className = 'victory-title';
    title.textContent = '🎉 Adventure Complete! 🎉';
    
    const stats = document.createElement('div');
    stats.className = 'victory-stats';
    stats.innerHTML = `
        <p>You've collected all ${gameState.topics.length} coins!</p>
        <p>You've learned about budgeting, needs vs wants, saving goals, and more!</p>
        <p>Remember these lessons as you manage your own money!</p>
    `;
    
    const restartBtn = document.createElement('button');
    restartBtn.className = 'start-button';
    restartBtn.textContent = 'Play Again';
    restartBtn.onclick = () => {
        localStorage.removeItem('budget_adventure_completed');
        location.reload();
    };
    
    content.appendChild(title);
    content.appendChild(stats);
    content.appendChild(restartBtn);
    overlay.appendChild(content);
    document.body.appendChild(overlay);
}

// Show start screen
function showStartScreen() {
    const overlay = document.createElement('div');
    overlay.id = 'start-overlay';
    overlay.className = 'modal-overlay';
    overlay.style.zIndex = '2000';
    
    const content = document.createElement('div');
    content.className = 'modal-content start-screen';
    
    const title = document.createElement('h1');
    title.className = 'start-title';
    title.textContent = '🌲 Budget Adventure 🌲';
    
    const instructions = document.createElement('div');
    instructions.className = 'start-instructions';
    instructions.innerHTML = `
        <p>Welcome young adventurer!</p>
        <p>Explore the forest and find coins to learn about money and budgeting.</p>
        <p>For each coin, read the lesson and answer the question to earn it!</p>
        <br>
        <p><strong>Controls:</strong></p>
        <p>Arrow keys or WASD to move</p>
        <p>Walk near a coin to learn about it!</p>
        <p>Collect all 8 coins to complete your adventure!</p>
    `;
    
    const startBtn = document.createElement('button');
    startBtn.className = 'start-button';
    startBtn.textContent = 'Start Adventure!';
    startBtn.onclick = () => {
        overlay.remove();
        gameState.gameStarted = true;
    };
    
    content.appendChild(title);
    content.appendChild(instructions);
    content.appendChild(startBtn);
    overlay.appendChild(content);
    document.body.appendChild(overlay);
}

// Initialize game
loadTopics().then(() => {
    showStartScreen();
    createGameWorld();
});
