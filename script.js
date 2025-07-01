// Инициализация Telegram WebApp
        const tg = window.Telegram.WebApp;
        if (tg) {
            tg.expand();
            tg.enableClosingConfirmation();
        }
        
        // Текущий пользователь
        let currentUser = null;
        let allTasks = [];
        let userTasks = [];
        let allUsers = [];
        let transactions = [];
        let activities = [];
        
        // Уровни и баллы для прогресса
        const levels = [
            { level: 1, points: 0 },
            { level: 2, points: 100 },
            { level: 3, points: 300 },
            { level: 4, points: 600 },
            { level: 5, points: 1000 },
            { level: 6, points: 1500 },
            { level: 7, points: 2100 },
            { level: 8, points: 2800 },
            { level: 9, points: 3600 },
            { level: 10, points: 4500 }
        ];
        
        // Инициализация приложения
        async function initApp() {
            // Проверяем, авторизован ли пользователь
            const storedUser = localStorage.getItem('currentUser');
            if (storedUser) {
                currentUser = JSON.parse(storedUser);
                updateUserData();
                await loadAllData();
                showScreen('main-screen');
                return;
            }
            
            // Показываем экран регистрации
            document.getElementById('register-screen').style.display = 'block';
        }
        
        // Загрузка всех данных с сервера
        async function loadAllData() {
            try {
                // Загружаем задания
                allTasks = await getTasksFromServer();
                
                if (currentUser) {
                    // Загружаем активные задания пользователя
                    userTasks = await getUserTasksFromServer(currentUser.id);
                    
                    // Загружаем всех пользователей для рейтинга
                    allUsers = await getUsersFromServer();
                    
                    // Загружаем транзакции пользователя
                    transactions = await getUserTransactionsFromServer(currentUser.id);
                    
                    // Загружаем активность пользователя
                    activities = await getUserActivitiesFromServer(currentUser.id);
                }
                
                // Обновляем интерфейс
                updateUI();
            } catch (error) {
                console.error('Ошибка загрузки данных:', error);
                if (tg) {
                    tg.showAlert('Не удалось загрузить данные. Проверьте подключение к интернету.');
                } else {
                    alert('Не удалось загрузить данные. Проверьте подключение к интернету.');
                }
            }
        }
        
        // Обновление данных пользователя в интерфейсе
        function updateUserData() {
            if (!currentUser) return;
            
            // Обновляем аватар
            const initials = currentUser.firstName ? currentUser.firstName.charAt(0) : 'U';
            if (currentUser.lastName) initials += currentUser.lastName.charAt(0);
            
            document.querySelectorAll('.user-avatar').forEach(el => {
                el.textContent = initials;
                if (currentUser.photoUrl) {
                    el.style.backgroundImage = `url(${currentUser.photoUrl})`;
                    el.style.backgroundSize = 'cover';
                }
            });
            
            // Обновляем прогресс
            updateUserProgress();
        }
        
        // Обновление прогресса пользователя
        function updateUserProgress() {
            if (!currentUser) return;
            
            // Определяем текущий уровень и следующий
            let currentLevel = 1;
            let nextLevelPoints = 100;
            
            for (let i = levels.length - 1; i >= 0; i--) {
                if (currentUser.points >= levels[i].points) {
                    currentLevel = levels[i].level;
                    nextLevelPoints = i < levels.length - 1 ? levels[i + 1].points : levels[i].points * 1.5;
                    break;
                }
            }
            
            // Обновляем уровень пользователя
            currentUser.level = currentLevel;
            
            // Рассчитываем прогресс до следующего уровня
            const prevLevelPoints = levels[currentLevel - 1] ? levels[currentLevel - 1].points : 0;
            const progress = Math.min(100, Math.floor(((currentUser.points - prevLevelPoints) / (nextLevelPoints - prevLevelPoints)) * 100));
            
            // Обновляем интерфейс
            document.querySelectorAll('.progress-fill').forEach(el => {
                el.style.width = `${progress}%`;
            });
            
            document.getElementById('userLevelLabel').textContent = `Уровень ${currentLevel}`;
            document.getElementById('userProgressValue').textContent = `${progress}%`;
            document.getElementById('profileNextLevel').textContent = `${nextLevelPoints - currentUser.points} до ${currentLevel + 1} уровня`;
            
            // Обновляем статистику
            document.getElementById('userPoints').textContent = currentUser.points;
            document.getElementById('userTasksCompleted').textContent = currentUser.tasksCompleted;
            document.getElementById('userPhotoReports').textContent = currentUser.photoReports;
            
            document.getElementById('profilePoints').textContent = `${currentUser.points} баллов`;
            document.getElementById('profilePointsValue').textContent = currentUser.points;
            document.getElementById('profileTasksCompleted').textContent = currentUser.tasksCompleted;
            document.getElementById('profilePhotoReports').textContent = currentUser.photoReports;
            document.getElementById('profileProgressFill').style.width = `${progress}%`;
            
            // Обновляем баланс
            document.getElementById('balanceAmount').textContent = currentUser.points;
        }
        
        // Обновление всего интерфейса
        function updateUI() {
            updateUserData();
            updateTasksList();
            updateActiveTasksList();
            updateMapMarkers();
            updateRatingLists();
            updateTransactionsHistory();
            updateUserActivity();
        }
        
        // Обновление списка заданий
        function updateTasksList() {
            const tasksList = document.getElementById('tasksList');
            tasksList.innerHTML = '';
            
            if (allTasks.length === 0) {
                tasksList.innerHTML = '<p class="text-muted">Нет доступных заданий</p>';
                document.getElementById('tasksCount').textContent = '0';
                return;
            }
            
            document.getElementById('tasksCount').textContent = allTasks.length;
            
            allTasks.forEach(task => {
                const taskItem = document.createElement('div');
                taskItem.className = 'task-item';
                taskItem.setAttribute('data-category', task.category);
                taskItem.setAttribute('onclick', `openTaskDetails('${task.id}')`);
                
                let badgeClass = 'badge-easy';
                if (task.difficulty === 'medium') badgeClass = 'badge-medium';
                else if (task.difficulty === 'hard') badgeClass = 'badge-hard';
                
                taskItem.innerHTML = `
                    <div class="task-content">
                        <div class="task-title">${task.title} <span class="badge ${badgeClass}">${getDifficultyText(task.difficulty)}</span></div>
                        <div class="task-subtitle">${task.description.substring(0, 50)}...</div>
                    </div>
                    <div class="task-points">${task.reward} баллов</div>
                `;
                
                tasksList.appendChild(taskItem);
            });
        }
        
        // Обновление списка активных заданий
        function updateActiveTasksList() {
            const activeTasksList = document.getElementById('activeTasksList');
            activeTasksList.innerHTML = '';
            
            if (userTasks.length === 0) {
                activeTasksList.innerHTML = '<p class="text-muted">У вас нет активных заданий</p>';
                document.getElementById('activeTasksCount').textContent = '0';
                return;
            }
            
            document.getElementById('activeTasksCount').textContent = userTasks.length;
            
            userTasks.forEach(task => {
                const taskInfo = allTasks.find(t => t.id === task.taskId);
                if (!taskInfo) return;
                
                const taskItem = document.createElement('div');
                taskItem.className = 'task-item';
                taskItem.setAttribute('onclick', `openTaskDetails('${taskInfo.id}')`);
                
                taskItem.innerHTML = `
                    <div class="task-checkbox"></div>
                    <div class="task-content">
                        <div class="task-title">${taskInfo.title}</div>
                        <div class="task-subtitle">Срок: до ${new Date(taskInfo.deadline).toLocaleDateString('ru-RU')}</div>
                    </div>
                `;
                
                activeTasksList.appendChild(taskItem);
            });
        }
        
        // Обновление маркеров на карте
        function updateMapMarkers() {
            const map = document.getElementById('map');
            const currentFilter = document.querySelector('#map-screen .tab.active').textContent.toLowerCase();
            
            // Очищаем старые маркеры (кроме маркера пользователя)
            document.querySelectorAll('.map-marker:not(.marker-user)').forEach(marker => {
                marker.remove();
            });
            
            // Добавляем маркеры для заданий
            allTasks.forEach(task => {
                if (currentFilter === 'все' || task.category === currentFilter) {
                    const marker = document.createElement('div');
                    marker.className = `map-marker marker-${task.difficulty}`;
                    marker.style.top = `${task.position.y}%`;
                    marker.style.left = `${task.position.x}%`;
                    marker.innerHTML = getMarkerIcon(task.category);
                    marker.onclick = () => openTaskDetails(task.id);
                    
                    map.appendChild(marker);
                }
            });
            
            // Обновляем список заданий на карте
            updateMapTasksList(currentFilter === 'все' ? 'all' : currentFilter);
        }
        
        // Обновление списка заданий на карте
        function updateMapTasksList(filter = 'all') {
            const tasksList = document.getElementById('mapTasksList');
            tasksList.innerHTML = '';
            
            const filteredTasks = allTasks.filter(task => {
                return filter === 'all' || task.category === filter;
            });
            
            if (filteredTasks.length === 0) {
                tasksList.innerHTML = '<p class="text-muted">Нет заданий в этой категории</p>';
                return;
            }
            
            filteredTasks.forEach(task => {
                const taskItem = document.createElement('div');
                taskItem.className = 'task-item';
                taskItem.setAttribute('onclick', `openTaskDetails('${task.id}')`);
                
                let badgeClass = 'badge-easy';
                if (task.difficulty === 'medium') badgeClass = 'badge-medium';
                else if (task.difficulty === 'hard') badgeClass = 'badge-hard';
                
                taskItem.innerHTML = `
                    <div class="task-content">
                        <div class="task-title">${task.title} <span class="badge ${badgeClass}">${getDifficultyText(task.difficulty)}</span></div>
                        <div class="task-subtitle">${task.location}</div>
                    </div>
                    <div class="task-points">${task.reward} баллов</div>
                `;
                
                tasksList.appendChild(taskItem);
            });
        }
        
        // Обновление рейтингов
        function updateRatingLists() {
            updateRatingList('all');
            updateRatingList('month');
            updateRatingList('year');
            
            // Обновляем позицию пользователя в рейтинге
            if (currentUser) {
                const userRank = getUserRank(currentUser.id);
                document.getElementById('userRank').textContent = userRank === -1 ? '-' : `${userRank} место`;
            }
        }
        
        function updateRatingList(period) {
            const ratingList = document.getElementById(`rating-${period}`);
            ratingList.innerHTML = '';
            
            // Фильтруем пользователей по периоду
            let rankedUsers = [...allUsers];
            
            if (period === 'month') {
                const monthAgo = new Date();
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                rankedUsers = rankedUsers.map(user => {
                    return {
                        ...user,
                        points: getPointsForPeriod(user.id, monthAgo)
                    };
                });
            } else if (period === 'year') {
                const yearAgo = new Date();
                yearAgo.setFullYear(yearAgo.getFullYear() - 1);
                rankedUsers = rankedUsers.map(user => {
                    return {
                        ...user,
                        points: getPointsForPeriod(user.id, yearAgo)
                    };
                });
            }
            
            // Сортируем по баллам
            rankedUsers.sort((a, b) => b.points - a.points);
            
            // Отображаем топ-20
            rankedUsers.slice(0, 20).forEach((user, index) => {
                const ratingItem = document.createElement('div');
                ratingItem.className = 'rating-item';
                
                const initials = user.firstName ? user.firstName.charAt(0) : 'U';
                if (user.lastName) initials += user.lastName.charAt(0);
                
                ratingItem.innerHTML = `
                    <div class="rating-avatar">${initials}</div>
                    <div class="rating-info">
                        <div class="rating-name">${user.firstName || 'Пользователь'} ${user.lastName || ''}</div>
                        <div class="rating-points">${user.points.toLocaleString()} баллов</div>
                    </div>
                    <div class="rating-position">${index + 1}</div>
                `;
                
                ratingList.appendChild(ratingItem);
            });
            
            // Добавляем текущего пользователя, если его нет в топе
            if (currentUser && period === 'all' && getUserRank(currentUser.id) > 20) {
                const userRank = getUserRank(currentUser.id);
                const ratingItem = document.createElement('div');
                ratingItem.className = 'rating-item';
                
                const initials = currentUser.firstName ? currentUser.firstName.charAt(0) : 'U';
                if (currentUser.lastName) initials += currentUser.lastName.charAt(0);
                
                ratingItem.innerHTML = `
                    <div class="rating-avatar">${initials}</div>
                    <div class="rating-info">
                        <div class="rating-name">${currentUser.firstName || 'Вы'} ${currentUser.lastName || ''}</div>
                        <div class="rating-points">${currentUser.points.toLocaleString()} баллов</div>
                    </div>
                    <div class="rating-position">${userRank}</div>
                `;
                
                ratingList.appendChild(ratingItem);
            }
        }
        
        // Получение позиции пользователя в рейтинге
        function getUserRank(userId) {
            const sortedUsers = [...allUsers].sort((a, b) => b.points - a.points);
            const userIndex = sortedUsers.findIndex(user => user.id === userId);
            return userIndex !== -1 ? userIndex + 1 : -1;
        }
        
        // Получение баллов за период
        function getPointsForPeriod(userId, startDate) {
            const userActivities = activities.filter(activity => 
                activity.userId === userId && new Date(activity.date) >= startDate
            );
            
            return userActivities.reduce((sum, activity) => sum + activity.points, 0);
        }
        
        // Обновление истории транзакций
        function updateTransactionsHistory() {
            const historyList = document.getElementById('transactionsHistory');
            historyList.innerHTML = '';
            
            if (transactions.length === 0) {
                historyList.innerHTML = '<p class="text-muted">Нет операций</p>';
                return;
            }
            
            transactions.forEach(transaction => {
                const historyItem = document.createElement('div');
                historyItem.className = 'history-item';
                historyItem.setAttribute('onclick', `showTransactionDetails('${transaction.id}')`);
                
                historyItem.innerHTML = `
                    <div class="history-info">
                        <div class="history-title">${transaction.description}</div>
                        <div class="history-date">${new Date(transaction.date).toLocaleDateString('ru-RU')}</div>
                    </div>
                    <div class="history-amount">${transaction.amount > 0 ? '+' : ''}${transaction.amount}</div>
                `;
                
                historyList.appendChild(historyItem);
            });
        }
        
        // Обновление активности пользователя
        function updateUserActivity() {
            const activityGrid = document.getElementById('userActivity');
            activityGrid.innerHTML = '';
            
            if (activities.length === 0) {
                activityGrid.innerHTML = '<p class="text-muted">Нет активности</p>';
                return;
            }
            
            // Показываем последние 5 активностей
            activities.slice(0, 5).forEach(activity => {
                const activityItem = document.createElement('div');
                activityItem.className = 'activity-item';
                
                let icon = '📌';
                if (activity.type === 'task') icon = '🗑️';
                else if (activity.type === 'photo_report') icon = '📷';
                else if (activity.type === 'withdrawal') icon = '💰';
                
                activityItem.innerHTML = `
                    <div class="activity-icon">${icon}</div>
                    <div class="activity-info">
                        <div class="activity-title">${activity.description}</div>
                        <div class="activity-date">${new Date(activity.date).toLocaleDateString('ru-RU')}</div>
                    </div>
                    <div class="activity-points">${activity.points > 0 ? '+' : ''}${activity.points}</div>
                `;
                
                activityGrid.appendChild(activityItem);
            });
        }
        
        // Получение текста сложности
        function getDifficultyText(difficulty) {
            switch(difficulty) {
                case 'easy': return 'Легко';
                case 'medium': return 'Средне';
                case 'hard': return 'Сложно';
                default: return '';
            }
        }
        
        // Получение иконки маркера по категории
        function getMarkerIcon(category) {
            switch(category) {
                case 'trash': return '🗑️';
                case 'recycling': return '♻️';
                case 'greening': return '🌱';
                default: return '📍';
            }
        }
        
        // Регистрация пользователя
        async function registerUser() {
            const firstName = document.getElementById('signupFirstName').value.trim();
            const lastName = document.getElementById('signupLastName').value.trim();
            const phone = document.getElementById('signupPhone').value.trim();
            const password = document.getElementById('signupPassword').value;
            const confirmPassword = document.getElementById('signupConfirmPassword').value;
            
            // Валидация данных
            if (!firstName || !lastName || !phone || !password || !confirmPassword) {
                alert('Пожалуйста, заполните все поля');
                return;
            }
            
            if (password !== confirmPassword) {
                alert('Пароли не совпадают');
                return;
            }
            
            if (password.length < 6) {
                alert('Пароль должен содержать не менее 6 символов');
                return;
            }
            
            try {
                // Проверяем, есть ли уже пользователь с таким телефоном
                const existingUser = await getUserByPhoneFromServer(phone);
                if (existingUser) {
                    alert('Пользователь с таким телефоном уже зарегистрирован');
                    return;
                }
                
                // Создаем нового пользователя
                currentUser = {
                    id: generateId(),
                    firstName: firstName,
                    lastName: lastName,
                    username: '',
                    photoUrl: '',
                    phoneNumber: phone,
                    password: password, // В реальном приложении пароль должен быть хеширован
                    points: 0,
                    level: 1,
                    tasksCompleted: 0,
                    photoReports: 0,
                    registrationDate: new Date().toISOString(),
                    lastActivity: new Date().toISOString(),
                    authMethod: 'phone'
                };
                
                await saveUserToServer(currentUser);
                
                // Обновляем данные пользователя
                updateUserData();
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                
                // Загружаем данные
                await loadAllData();
                
                // Показываем главный экран
                showScreen('main-screen');
                
                showSuccess('Регистрация прошла успешно! Добро пожаловать в приложение.');
            } catch (error) {
                console.error('Ошибка регистрации:', error);
                alert('Не удалось зарегистрироваться. Попробуйте позже.');
            }
        }
        
        // Вход пользователя
        async function loginUser() {
            const phone = document.getElementById('loginPhone').value.trim();
            const password = document.getElementById('loginPassword').value;
            
            if (!phone || !password) {
                alert('Пожалуйста, заполните все поля');
                return;
            }
            
            try {
                // Ищем пользователя по телефону
                const user = await getUserByPhoneFromServer(phone);
                
                if (!user) {
                    alert('Пользователь с таким телефоном не найден');
                    return;
                }
                
                // Проверяем пароль (в реальном приложении должно быть хеширование)
                if (user.password !== password) {
                    alert('Неверный пароль');
                    return;
                }
                
                // Устанавливаем текущего пользователя
                currentUser = user;
                
                // Обновляем данные пользователя
                updateUserData();
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                
                // Загружаем данные
                await loadAllData();
                
                // Показываем главный экран
                showScreen('main-screen');
                
                showSuccess('Вход выполнен успешно!');
            } catch (error) {
                console.error('Ошибка входа:', error);
                alert('Не удалось войти. Попробуйте позже.');
            }
        }
        
        // Показать экран
        function showScreen(screenId) {
            // Проверяем авторизацию для всех экранов, кроме регистрации и входа
            if (screenId !== 'register-screen' && 
                screenId !== 'login-screen' && 
                screenId !== 'signup-screen' && 
                !currentUser) {
                document.getElementById('register-screen').style.display = 'block';
                return;
            }
            
            document.querySelectorAll('[id$="-screen"]').forEach(screen => {
                screen.style.display = 'none';
            });
            
            const screen = document.getElementById(screenId);
            if (screen) {
                screen.style.display = 'block';
                
                // Добавляем анимацию
                screen.classList.add('fade-in');
                setTimeout(() => {
                    screen.classList.remove('fade-in');
                }, 400);
                
                // Обновить активную вкладку в нижнем меню
                document.querySelectorAll('.nav-item').forEach(item => {
                    item.classList.remove('nav-active');
                });
                
                if (screenId === 'main-screen') {
                    document.querySelector('.nav-item:nth-child(1)').classList.add('nav-active');
                } else if (screenId === 'map-screen') {
                    document.querySelector('.nav-item:nth-child(2)').classList.add('nav-active');
                } else if (screenId === 'profile-screen') {
                    document.querySelector('.nav-item:nth-child(3)').classList.add('nav-active');
                }
                
                // Прокрутка вверх
                window.scrollTo(0, 0);
                
                // Инициализация карты при открытии экрана
                if (screenId === 'map-screen') {
                    updateMapMarkers();
                }
            }
        }
        
        // Функции для обработки нажатий
        function openSettings() {
            showScreen('settings-screen');
        }
        
        function openTasks() {
            showScreen('tasks-screen');
        }
        
        function openBalance() {
            showScreen('balance-screen');
        }
        
        function openRating() {
            showScreen('rating-screen');
        }
        
        function openProfile() {
            showScreen('profile-screen');
        }
        
        function openPhotoReport() {
            showScreen('photo-report-screen');
        }
        
        function openActiveTasks() {
            showScreen('active-tasks-screen');
        }
        
        function openCreateTask() {
            showScreen('create-task-screen');
        }
        
        function openHelp() {
            showScreen('help-screen');
        }
        
        function openAbout() {
            showScreen('about-screen');
        }
        
        async function openTaskDetails(taskId) {
            const task = allTasks.find(t => t.id === taskId);
            if (!task) {
                alert('Задание не найдено');
                return;
            }
            
            // Устанавливаем данные задачи
            document.getElementById('taskTitle').textContent = task.title;
            document.getElementById('taskDescription').textContent = task.description;
            document.getElementById('taskLocation').textContent = task.location;
            document.getElementById('taskReward').textContent = `${task.reward} баллов`;
            document.getElementById('taskDeadline').textContent = new Date(task.deadline).toLocaleDateString('ru-RU');
            
            // Устанавливаем фото задачи
            const taskImage = document.getElementById('taskImage');
            taskImage.innerHTML = task.photoUrl 
                ? `<img src="${task.photoUrl}" alt="${task.title}" style="width:100%;height:100%;object-fit:cover;">`
                : 'Фото задания';
            
            // Проверяем, является ли задание активным для пользователя
            const isActiveTask = userTasks.some(t => t.taskId === task.id && t.status === 'in_progress');
            
            if (isActiveTask) {
                document.getElementById('taskActionBtn').innerHTML = '<span class="btn-icon">📷</span> Сделать фотоотчет';
                document.getElementById('taskActionBtn').onclick = function() { openTaskCompletion(taskId); };
            } else {
                document.getElementById('taskActionBtn').innerHTML = '<span class="btn-icon">✅</span> Принять задание';
                document.getElementById('taskActionBtn').onclick = function() { acceptTask(taskId); };
            }
            
            // Устанавливаем сложность
            const difficultyBadge = document.createElement('span');
            difficultyBadge.className = `badge badge-${task.difficulty}`;
            difficultyBadge.textContent = getDifficultyText(task.difficulty);
            
            const badgeContainer = document.querySelector('#task-details-screen .mt-16');
            badgeContainer.innerHTML = '';
            badgeContainer.appendChild(difficultyBadge);
            
            const deadlineText = document.createElement('span');
            deadlineText.className = 'text-muted';
            deadlineText.textContent = ` Срок: до ${new Date(task.deadline).toLocaleDateString('ru-RU')}`;
            badgeContainer.appendChild(deadlineText);
            
            showScreen('task-details-screen');
        }
        
        // Открытие экрана выполнения задания
        function openTaskCompletion(taskId) {
            const task = allTasks.find(t => t.id === taskId);
            if (!task) return;
            
            // Устанавливаем данные задачи
            document.getElementById('taskCompletePhotoPreview').innerHTML = task.photoUrl 
                ? `<img src="${task.photoUrl}" alt="${task.title}" style="width:100%;height:100%;object-fit:cover;">`
                : '<span>Нажмите для загрузки фото</span>';
            document.getElementById('taskCompleteDescription').value = '';
            
            showScreen('task-complete-screen');
        }
        
        // Фильтрация заданий
        function filterTasks(filter) {
            const tasks = document.querySelectorAll('.task-item[data-category]');
            
            tasks.forEach(task => {
                if (filter === 'all' || task.dataset.category === filter) {
                    task.style.display = 'flex';
                } else {
                    task.style.display = 'none';
                }
            });
            
            // Обновляем активную вкладку
            document.querySelectorAll('#tasks-screen .tab').forEach(tab => {
                tab.classList.remove('active');
            });
            event.target.classList.add('active');
            
            // Обновляем счетчик
            const visibleTasks = document.querySelectorAll('#tasksList .task-item[style="display: flex;"]').length;
            document.getElementById('tasksCount').textContent = visibleTasks;
        }
        
        // Поиск заданий
        function searchTasks() {
            const searchTerm = document.getElementById('taskSearch').value.toLowerCase();
            const taskItems = document.querySelectorAll('#tasksList .task-item');
            let visibleCount = 0;
            
            taskItems.forEach(item => {
                const title = item.querySelector('.task-title').textContent.toLowerCase();
                const subtitle = item.querySelector('.task-subtitle')?.textContent.toLowerCase() || '';
                
                if (title.includes(searchTerm) || subtitle.includes(searchTerm)) {
                    item.style.display = 'flex';
                    visibleCount++;
                } else {
                    item.style.display = 'none';
                }
            });
            
            document.getElementById('tasksCount').textContent = visibleCount;
        }
        
        function filterMapTasks(filter) {
            document.querySelectorAll('#map-screen .tab').forEach(tab => {
                tab.classList.remove('active');
            });
            event.target.classList.add('active');
            
            updateMapMarkers();
        }
        
        function changeRatingTab(tab) {
            // Обновляем активную вкладку
            document.querySelectorAll('#rating-screen .tab').forEach(t => {
                t.classList.remove('active');
            });
            event.target.classList.add('active');
            
            // Показываем соответствующий рейтинг
            document.querySelectorAll('.rating-list').forEach(el => {
                el.style.display = 'none';
            });
            
            document.getElementById(`rating-${tab}`).style.display = 'block';
        }
        
        // Принятие задания
        async function acceptTask(taskId) {
            const task = allTasks.find(t => t.id === taskId);
            if (!task || !currentUser) return;
            
            // Проверяем, не принято ли уже это задание
            const isAlreadyAccepted = userTasks.some(t => t.taskId === taskId);
            if (isAlreadyAccepted) {
                alert('Вы уже приняли это задание');
                return;
            }
            
            try {
                // Добавляем задание в активные
                const userTask = {
                    id: generateId(),
                    userId: currentUser.id,
                    taskId: task.id,
                    status: 'in_progress',
                    acceptedDate: new Date().toISOString()
                };
                
                await saveUserTaskToServer(userTask);
                userTasks.push(userTask);
                
                // Обновляем интерфейс
                updateActiveTasksList();
                
                showSuccess('Задание принято! Теперь оно отображается в ваших активных заданиях.');
                
                setTimeout(() => {
                    showScreen('active-tasks-screen');
                }, 1500);
            } catch (error) {
                console.error('Ошибка принятия задания:', error);
                alert('Не удалось принять задание. Попробуйте позже.');
            }
        }
        
        // Отправка фотодоноса
        async function submitPhotoReport() {
            if (!currentUser) {
                showScreen('register-screen');
                return;
            }
            
            const photo = document.getElementById('photoPreview').querySelector('img');
            const description = document.getElementById('photoDescription').value;
            const category = document.getElementById('photoCategory').value;
            const address = document.getElementById('photoAddress').value;
            const points = document.getElementById('photoPoints').value;
            
            if (!photo || !description || !address || !points) {
                alert('Пожалуйста, заполните все поля');
                return;
            }
            
            try {
                // Создаем фотодонос
                const photoReport = {
                    id: generateId(),
                    userId: currentUser.id,
                    photoUrl: photo.src,
                    description: description,
                    category: category,
                    address: address,
                    suggestedPoints: parseInt(points),
                    status: 'pending',
                    date: new Date().toISOString()
                };
                
                await savePhotoReportToServer(photoReport);
                
                // Добавляем активность
                const activity = {
                    id: generateId(),
                    userId: currentUser.id,
                    type: 'photo_report',
                    description: 'Фотодонос: ' + description.substring(0, 30) + (description.length > 30 ? '...' : ''),
                    points: 20,
                    date: new Date().toISOString()
                };
                
                await saveActivityToServer(activity);
                activities.unshift(activity);
                
                // Обновляем статистику пользователя
                currentUser.photoReports++;
                currentUser.points += 20;
                
                // Проверяем бонус за 10 фотодоносов
                if (currentUser.photoReports % 10 === 0) {
                    currentUser.points += 200;
                    
                    const bonusActivity = {
                        id: generateId(),
                        userId: currentUser.id,
                        type: 'bonus',
                        description: 'Бонус за 10 фотодоносов',
                        points: 200,
                        date: new Date().toISOString()
                    };
                    
                    await saveActivityToServer(bonusActivity);
                    activities.unshift(bonusActivity);
                    
                    showSuccess(`Фотодонос принят! Вы получили 20 баллов. Бонус: +200 баллов за 10 фотодоносов!`);
                } else {
                    showSuccess('Фотодонос принят! Вы получили 20 баллов.');
                }
                
                // Обновляем данные на сервере
                await saveUserToServer(currentUser);
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                
                // Обновляем интерфейс
                updateUI();
                
                setTimeout(() => {
                    showScreen('map-screen');
                }, 1500);
            } catch (error) {
                console.error('Ошибка отправки фотодоноса:', error);
                alert('Не удалось отправить фотодонос. Попробуйте позже.');
            }
        }
        
        // Выполнение задания самостоятельно
        async function completeTaskYourself() {
            closeModal('photoReportActionModal');
            
            try {
                // Создаем фотодонос
                const photoReport = {
                    id: generateId(),
                    userId: currentUser.id,
                    photoUrl: document.getElementById('photoPreview').querySelector('img')?.src || '',
                    description: document.getElementById('photoDescription').value,
                    category: document.getElementById('photoCategory').value,
                    address: document.getElementById('photoAddress').value,
                    suggestedPoints: parseInt(document.getElementById('photoPoints').value),
                    status: 'completed',
                    date: new Date().toISOString()
                };
                
                await savePhotoReportToServer(photoReport);
                
                // Добавляем активность
                const activity = {
                    id: generateId(),
                    userId: currentUser.id,
                    type: 'photo_report',
                    description: 'Фотодонос: ' + photoReport.description.substring(0, 30) + (photoReport.description.length > 30 ? '...' : ''),
                    points: 20,
                    date: new Date().toISOString()
                };
                
                await saveActivityToServer(activity);
                activities.unshift(activity);
                
                // Обновляем статистику пользователя
                currentUser.photoReports++;
                currentUser.points += 20;
                
                // Проверяем бонус за 10 фотодоносов
                if (currentUser.photoReports % 10 === 0) {
                    currentUser.points += 200;
                    
                    const bonusActivity = {
                        id: generateId(),
                        userId: currentUser.id,
                        type: 'bonus',
                        description: 'Бонус за 10 фотодоносов',
                        points: 200,
                        date: new Date().toISOString()
                    };
                    
                    await saveActivityToServer(bonusActivity);
                    activities.unshift(bonusActivity);
                }
                
                // Обновляем данные на сервере
                await saveUserToServer(currentUser);
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                
                // Показываем успешное сообщение
                showSuccess('Фотодонос принят! Вы получили 20 баллов. Теперь вы можете выполнить это задание.');
                
                // Переходим к выполнению задания
                setTimeout(() => {
                    showScreen('create-task-screen');
                }, 1500);
            } catch (error) {
                console.error('Ошибка выполнения задания:', error);
                alert('Не удалось выполнить задание. Попробуйте позже.');
            }
        }
        
        // Публикация задания для других
        async function publishTaskForOthers() {
            closeModal('photoReportActionModal');
            
            try {
                // Создаем фотодонос
                const photoReport = {
                    id: generateId(),
                    userId: currentUser.id,
                    photoUrl: document.getElementById('photoPreview').querySelector('img')?.src || '',
                    description: document.getElementById('photoDescription').value,
                    category: document.getElementById('photoCategory').value,
                    address: document.getElementById('photoAddress').value,
                    suggestedPoints: parseInt(document.getElementById('photoPoints').value),
                    status: 'published',
                    date: new Date().toISOString()
                };
                
                await savePhotoReportToServer(photoReport);
                
                // Добавляем активность
                const activity = {
                    id: generateId(),
                    userId: currentUser.id,
                    type: 'photo_report',
                    description: 'Фотодонос: ' + photoReport.description.substring(0, 30) + (photoReport.description.length > 30 ? '...' : ''),
                    points: 20,
                    date: new Date().toISOString()
                };
                
                await saveActivityToServer(activity);
                activities.unshift(activity);
                
                // Создаем новое задание
                const newTask = {
                    id: generateId(),
                    title: photoReport.description.substring(0, 30) + (photoReport.description.length > 30 ? '...' : ''),
                    description: photoReport.description,
                    location: photoReport.address,
                    reward: photoReport.suggestedPoints,
                    deadline: getFutureDate(7), // +7 дней от текущей даты
                    category: photoReport.category,
                    difficulty: getRandomDifficulty(),
                    creatorId: currentUser.id,
                    status: "active",
                    photoUrl: photoReport.photoUrl,
                    position: getRandomPosition(),
                    createdAt: new Date().toISOString()
                };
                
                await saveTaskToServer(newTask);
                allTasks.unshift(newTask);
                
                // Обновляем статистику пользователя
                currentUser.photoReports++;
                currentUser.points += 20;
                
                // Проверяем бонус за 10 фотодоносов
                if (currentUser.photoReports % 10 === 0) {
                    currentUser.points += 200;
                    
                    const bonusActivity = {
                        id: generateId(),
                        userId: currentUser.id,
                        type: 'bonus',
                        description: 'Бонус за 10 фотодоносов',
                        points: 200,
                        date: new Date().toISOString()
                    };
                    
                    await saveActivityToServer(bonusActivity);
                    activities.unshift(bonusActivity);
                }
                
                // Обновляем данные на сервере
                await saveUserToServer(currentUser);
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                
                // Обновляем интерфейс
                updateUI();
                
                // Показываем успешное сообщение
                showSuccess('Задание опубликовано! Вы получили 20 баллов. Другие пользователи смогут его выполнить.');
                
                setTimeout(() => {
                    showScreen('tasks-screen');
                }, 1500);
            } catch (error) {
                console.error('Ошибка публикации задания:', error);
                alert('Не удалось опубликовать задание. Попробуйте позже.');
            }
        }
        
        // Отправка выполнения задания
        async function submitTaskCompletion() {
            if (!currentUser) {
                showScreen('register-screen');
                return;
            }
            
            const description = document.getElementById('taskCompleteDescription').value;
            if (!description) {
                alert('Пожалуйста, опишите выполненную работу');
                return;
            }
            
            try {
                // Находим активное задание
                const activeTask = userTasks.find(t => t.status === 'in_progress');
                if (!activeTask) {
                    alert('У вас нет активных заданий');
                    return;
                }
                
                const task = allTasks.find(t => t.id === activeTask.taskId);
                if (!task) {
                    alert('Задание не найдено');
                    return;
                }
                
                // Имитация анализа нейросетью
                document.getElementById('taskCompletePollutionDetection').style.display = 'block';
                
                // Обновляем статус задания
                activeTask.status = 'completed';
                activeTask.completedDate = new Date().toISOString();
                activeTask.photoUrl = document.getElementById('taskCompletePhotoPreview').querySelector('img')?.src || '';
                activeTask.description = description;
                
                await updateUserTaskOnServer(activeTask);
                
                // Добавляем баллы за выполнение задания
                const activity = {
                    id: generateId(),
                    userId: currentUser.id,
                    type: 'task',
                    description: 'Выполнение задания: ' + task.title,
                    points: task.reward,
                    date: new Date().toISOString()
                };
                
                await saveActivityToServer(activity);
                activities.unshift(activity);
                
                // Обновляем статистику пользователя
                currentUser.points += task.reward;
                currentUser.tasksCompleted++;
                
                // Проверяем бонус за 10 фотодоносов
                if (currentUser.photoReports >= 10) {
                    currentUser.points += 200;
                    
                    const bonusActivity = {
                        id: generateId(),
                        userId: currentUser.id,
                        type: 'bonus',
                        description: 'Бонус за 10 фотодоносов',
                        points: 200,
                        date: new Date().toISOString()
                    };
                    
                    await saveActivityToServer(bonusActivity);
                    activities.unshift(bonusActivity);
                    
                    showSuccess(`Задание выполнено! Вы получили ${task.reward} баллов. Бонус: +200 баллов за 10 фотодоносов!`);
                } else {
                    showSuccess(`Задание выполнено! Вы получили ${task.reward} баллов.`);
                }
                
                // Обновляем данные на сервере
                await saveUserToServer(currentUser);
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                
                // Обновляем интерфейс
                updateUI();
                
                setTimeout(() => {
                    showScreen('main-screen');
                }, 1500);
            } catch (error) {
                console.error('Ошибка выполнения задания:', error);
                alert('Не удалось выполнить задание. Попробуйте позже.');
            }
        }
        
        // Публикация задания
        async function publishTask() {
            if (!currentUser) {
                showScreen('register-screen');
                return;
            }
            
            const problemDescription = document.getElementById('taskProblemDescription').value;
            const address = document.getElementById('taskAddress').value;
            const points = document.getElementById('taskPoints').value;
            
            if (!problemDescription || !address || !points) {
                alert('Пожалуйста, заполните все поля');
                return;
            }
            
            try {
                // Создаем новое задание
                const newTask = {
                    id: generateId(),
                    title: problemDescription.substring(0, 30) + (problemDescription.length > 30 ? '...' : ''),
                    description: problemDescription,
                    location: address,
                    reward: parseInt(points),
                    deadline: getFutureDate(7), // +7 дней от текущей даты
                    category: document.getElementById('taskCategory').value,
                    difficulty: getRandomDifficulty(),
                    creatorId: currentUser.id,
                    status: "active",
                    photoUrl: document.querySelector('#create-task-screen .photo-preview img')?.src || '',
                    position: getRandomPosition(),
                    createdAt: new Date().toISOString()
                };
                
                await saveTaskToServer(newTask);
                allTasks.unshift(newTask);
                
                showSuccess('Задание опубликовано! Теперь другие пользователи смогут его выполнить.');
                
                setTimeout(() => {
                    showScreen('tasks-screen');
                }, 1500);
            } catch (error) {
                console.error('Ошибка публикации задания:', error);
                alert('Не удалось опубликовать задание. Попробуйте позже.');
            }
        }
        
        // Вывод средств
        async function withdrawFunds() {
            if (!currentUser) {
                showScreen('register-screen');
                return;
            }
            
            if (currentUser.points < 100) {
                alert('Минимальная сумма для вывода - 100 баллов (100 рублей)');
                return;
            }
            
            try {
                // Создаем транзакцию
                const transaction = {
                    id: generateId(),
                    userId: currentUser.id,
                    amount: -currentUser.points,
                    description: 'Вывод средств',
                    status: 'pending',
                    date: new Date().toISOString()
                };
                
                await saveTransactionToServer(transaction);
                transactions.unshift(transaction);
                
                // Добавляем активность
                const activity = {
                    id: generateId(),
                    userId: currentUser.id,
                    type: 'withdrawal',
                    description: 'Вывод средств',
                    points: -currentUser.points,
                    date: new Date().toISOString()
                };
                
                await saveActivityToServer(activity);
                activities.unshift(activity);
                
                // Обновляем баланс пользователя
                currentUser.points = 0;
                await saveUserToServer(currentUser);
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                
                // Обновляем интерфейс
                updateUI();
                
                showSuccess(`Запрос на вывод ${transaction.amount * -1} рублей отправлен! Ожидайте поступления средств в течение 3 рабочих дней.`);
            } catch (error) {
                console.error('Ошибка вывода средств:', error);
                alert('Не удалось выполнить вывод средств. Попробуйте позже.');
            }
        }
        
        // Показать детали транзакции
        function showTransactionDetails(transactionId) {
            const transaction = transactions.find(t => t.id === transactionId);
            if (!transaction) return;
            
            alert(`Детали операции:\n${transaction.description}\nСумма: ${transaction.amount} баллов\nДата: ${new Date(transaction.date).toLocaleDateString('ru-RU')}`);
        }
        
        // Функции для работы с фото
        let currentPhotoContext = null;
        
        function showPhotoOptions(context = 'report') {
            currentPhotoContext = context;
            document.getElementById('photoModal').style.display = 'flex';
        }
        
        function takePhoto() {
            closeModal('photoModal');
            alert('Открытие камеры для фото');
            // В реальном приложении здесь будет вызов API камеры
            const photoUrl = 'https://via.placeholder.com/200';
            
            if (currentPhotoContext === 'report') {
                document.getElementById('photoPreview').innerHTML = `<img src="${photoUrl}" alt="Фото">`;
            } else if (currentPhotoContext === 'complete') {
                document.getElementById('taskCompletePhotoPreview').innerHTML = `<img src="${photoUrl}" alt="Фото">`;
            } else {
                document.querySelector('#create-task-screen .photo-preview').innerHTML = `<img src="${photoUrl}" alt="Фото задания">`;
            }
        }
        
        function choosePhoto() {
            closeModal('photoModal');
            alert('Выбор фото из галереи');
            // В реальном приложении здесь будет вызов API галереи
            const photoUrl = 'https://via.placeholder.com/200';
            
            if (currentPhotoContext === 'report') {
                document.getElementById('photoPreview').innerHTML = `<img src="${photoUrl}" alt="Фото">`;
            } else if (currentPhotoContext === 'complete') {
                document.getElementById('taskCompletePhotoPreview').innerHTML = `<img src="${photoUrl}" alt="Фото">`;
            } else {
                document.querySelector('#create-task-screen .photo-preview').innerHTML = `<img src="${photoUrl}" alt="Фото задания">`;
            }
        }
        
        function showOnMap() {
            alert('Показать задание на карте');
            showScreen('map-screen');
        }
        
        function selectOnMap() {
            alert('Выбор места на карте');
            // Здесь будет логика выбора места на карте
            document.getElementById('taskAddress').value = 'Парк Горького, Москва';
            document.getElementById('photoAddress').value = 'Парк Горького, Москва';
        }
        
        // Настройки уведомлений
        function openNotificationSettings(type) {
            let title = '';
            if (type === 'reminders') title = 'Напоминания о заданиях';
            else if (type === 'verification') title = 'Проверка заданий';
            else if (type === 'points') title = 'Получение баллов';
            
            document.getElementById('notificationSettingsTitle').textContent = title;
            document.getElementById('notificationSettingsModal').style.display = 'flex';
        }
        
        function saveNotificationSettings() {
            closeModal('notificationSettingsModal');
            showSuccess('Настройки уведомлений сохранены');
        }
        
        // Настройки языка
        function openLanguageSettings() {
            document.getElementById('languageModal').style.display = 'flex';
        }
        
        function selectLanguage(lang) {
            closeModal('languageModal');
            showSuccess(`Язык изменен на ${lang === 'ru' ? 'Русский' : 'English'}`);
        }
        
        // Подтверждение выхода
        function showLogoutConfirmation() {
            document.getElementById('logoutModal').style.display = 'flex';
        }
        
        function logout() {
            currentUser = null;
            localStorage.removeItem('currentUser');
            showScreen('register-screen');
        }
        
        // Показать успешное выполнение
        function showSuccess(message) {
            document.getElementById('successMessage').textContent = message;
            document.getElementById('successModal').style.display = 'flex';
        }
        
        // Закрытие модальных окон
        function closeModal(modalId) {
            document.getElementById(modalId).style.display = 'none';
        }
        
        // Вспомогательные функции
        function getRandomPosition() {
            return {
                x: 30 + Math.random() * 40,
                y: 20 + Math.random() * 60
            };
        }
        
        function getRandomDifficulty() {
            const rand = Math.random();
            return rand < 0.6 ? 'easy' : rand < 0.9 ? 'medium' : 'hard';
        }
        
        function getFutureDate(days) {
            const date = new Date();
            date.setDate(date.getDate() + days);
            return date.toISOString();
        }
        
        function generateId() {
            return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        }
        
        // Функции для работы с сервером (заглушки)
        async function getUserFromServer(userId) {
            // В реальном приложении здесь будет запрос к API
            return null;
        }
        
        async function getUserByPhoneFromServer(phoneNumber) {
            // В реальном приложении здесь будет запрос к API
            // Для демонстрации используем localStorage
            const users = JSON.parse(localStorage.getItem('users')) || [];
            return users.find(user => user.phoneNumber === phoneNumber);
        }
        
        async function saveUserToServer(user) {
            // В реальном приложении здесь будет запрос к API
            // Для демонстрации используем localStorage
            const users = JSON.parse(localStorage.getItem('users')) || [];
            const existingIndex = users.findIndex(u => u.id === user.id);
            
            if (existingIndex !== -1) {
                users[existingIndex] = user;
            } else {
                users.push(user);
            }
            
            localStorage.setItem('users', JSON.stringify(users));
            return user;
        }
        
        async function getTasksFromServer() {
            // В реальном приложении здесь будет запрос к API
            // Возвращаем тестовые данные
            return [
                {
                    id: 'task1',
                    title: 'Уборка мусора в парке',
                    description: 'Необходимо собрать мусор в центральном парке города',
                    location: 'Центральный парк, Москва',
                    reward: 150,
                    deadline: getFutureDate(3),
                    category: 'trash',
                    difficulty: 'easy',
                    creatorId: 'admin',
                    status: "active",
                    photoUrl: 'https://via.placeholder.com/200?text=Парк',
                    position: { x: 35, y: 45 },
                    createdAt: new Date().toISOString()
                },
                {
                    id: 'task2',
                    title: 'Сортировка отходов',
                    description: 'Помочь с сортировкой отходов на переработку',
                    location: 'Ул. Экологическая, 15',
                    reward: 200,
                    deadline: getFutureDate(5),
                    category: 'recycling',
                    difficulty: 'medium',
                    creatorId: 'admin',
                    status: "active",
                    photoUrl: 'https://via.placeholder.com/200?text=Сортировка',
                    position: { x: 50, y: 30 },
                    createdAt: new Date().toISOString()
                },
                {
                    id: 'task3',
                    title: 'Посадка деревьев',
                    description: 'Участие в посадке новых деревьев в районе',
                    location: 'Сквер Мира, Москва',
                    reward: 250,
                    deadline: getFutureDate(7),
                    category: 'greening',
                    difficulty: 'medium',
                    creatorId: 'admin',
                    status: "active",
                    photoUrl: 'https://via.placeholder.com/200?text=Деревья',
                    position: { x: 65, y: 55 },
                    createdAt: new Date().toISOString()
                }
            ];
        }
        
        async function saveTaskToServer(task) {
            // В реальном приложении здесь будет запрос к API
            const tasks = JSON.parse(localStorage.getItem('tasks')) || [];
            tasks.push(task);
            localStorage.setItem('tasks', JSON.stringify(tasks));
            return task;
        }
        
        async function getUserTasksFromServer(userId) {
            // В реальном приложении здесь будет запрос к API
            return [];
        }
        
        async function saveUserTaskToServer(userTask) {
            // В реальном приложении здесь будет запрос к API
            const userTasks = JSON.parse(localStorage.getItem('userTasks')) || [];
            userTasks.push(userTask);
            localStorage.setItem('userTasks', JSON.stringify(userTasks));
            return userTask;
        }
        
        async function updateUserTaskOnServer(userTask) {
            // В реальном приложении здесь будет запрос к API
            const userTasks = JSON.parse(localStorage.getItem('userTasks')) || [];
            const index = userTasks.findIndex(t => t.id === userTask.id);
            if (index !== -1) {
                userTasks[index] = userTask;
                localStorage.setItem('userTasks', JSON.stringify(userTasks));
            }
            return userTask;
        }
        
        async function getUsersFromServer() {
            // В реальном приложении здесь будет запрос к API
            // Возвращаем тестовых пользователей
            return [
                {
                    id: 'user1',
                    firstName: 'Иван',
                    lastName: 'Петров',
                    username: 'ivan_petrov',
                    photoUrl: '',
                    phoneNumber: '+79161234567',
                    password: 'password123',
                    points: 1250,
                    level: 4,
                    tasksCompleted: 12,
                    photoReports: 8,
                    registrationDate: '2025-01-15T10:00:00Z',
                    lastActivity: new Date().toISOString(),
                    authMethod: 'phone'
                },
                {
                    id: 'user2',
                    firstName: 'Мария',
                    lastName: 'Сидорова',
                    username: 'maria_sidorova',
                    photoUrl: '',
                    phoneNumber: '+79167654321',
                    password: 'password123',
                    points: 980,
                    level: 3,
                    tasksCompleted: 9,
                    photoReports: 5,
                    registrationDate: '2025-02-20T11:30:00Z',
                    lastActivity: new Date().toISOString(),
                    authMethod: 'phone'
                },
                {
                    id: 'user3',
                    firstName: 'Алексей',
                    lastName: 'Иванов',
                    username: 'alex_ivanov',
                    photoUrl: '',
                    phoneNumber: '+79165554433',
                    password: 'password123',
                    points: 750,
                    level: 3,
                    tasksCompleted: 7,
                    photoReports: 4,
                    registrationDate: '2025-03-10T09:15:00Z',
                    lastActivity: new Date().toISOString(),
                    authMethod: 'phone'
                }
            ];
        }
        
        async function getUserTransactionsFromServer(userId) {
            // В реальном приложении здесь будет запрос к API
            return [];
        }
        
        async function saveTransactionToServer(transaction) {
            // В реальном приложении здесь будет запрос к API
            const transactions = JSON.parse(localStorage.getItem('transactions')) || [];
            transactions.push(transaction);
            localStorage.setItem('transactions', JSON.stringify(transactions));
            return transaction;
        }
        
        async function getUserActivitiesFromServer(userId) {
            // В реальном приложении здесь будет запрос к API
            return [];
        }
        
        async function saveActivityToServer(activity) {
            // В реальном приложении здесь будет запрос к API
            const activities = JSON.parse(localStorage.getItem('activities')) || [];
            activities.push(activity);
            localStorage.setItem('activities', JSON.stringify(activities));
            return activity;
        }
        
        async function savePhotoReportToServer(photoReport) {
            // В реальном приложении здесь будет запрос к API
            const photoReports = JSON.parse(localStorage.getItem('photoReports')) || [];
            photoReports.push(photoReport);
            localStorage.setItem('photoReports', JSON.stringify(photoReports));
            return photoReport;
        }
        
        // Обработка вкладок
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', function() {
                const tabsContainer = this.closest('.tabs');
                if (tabsContainer) {
                    tabsContainer.querySelectorAll('.tab').forEach(t => {
                        t.classList.remove('active');
                    });
                    this.classList.add('active');
                }
            });
        });
        
        // Закрытие модального окна при клике вне его
        window.addEventListener('click', function(event) {
            if (event.target.classList.contains('modal')) {
                event.target.style.display = 'none';
            }
        });
        
        // Инициализация при загрузке
        document.addEventListener('DOMContentLoaded', () => {
            initApp();
        });
