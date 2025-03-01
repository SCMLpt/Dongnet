document.addEventListener('DOMContentLoaded', () => {
    let networkData = JSON.parse(localStorage.getItem('networkData')) || {
        participantId: `user-${Math.random().toString(36).substr(2, 9)}`,
        totalContributions: 0,
        lastUpdated: new Date().toISOString(),
        actions: []
    };

    // URL에서 공유된 데이터 불러오기
    const urlParams = new URLSearchParams(window.location.search);
    const sharedData = urlParams.get('data');
    let sharedActions = [];
    if (sharedData) {
        try {
            sharedActions = JSON.parse(decodeURIComponent(atob(sharedData))).actions || [];
            console.log('Shared actions loaded:', sharedActions);
        } catch (e) {
            console.error('Invalid shared data:', e);
        }
    }

    function updateNetworkDisplay() {
        const totalContributionsElement = document.getElementById('totalContributions');
        const actionCountElement = document.getElementById('actionCount');
        const historyBody = document.getElementById('historyBody');

        if (!totalContributionsElement || !actionCountElement || !historyBody) {
            console.error('Required elements not found for updateNetworkDisplay');
            return;
        }

        totalContributionsElement.textContent = networkData.totalContributions.toFixed(2);
        actionCountElement.textContent = networkData.actions.length;

        historyBody.innerHTML = '';

        // 내 기록 표시
        networkData.actions.forEach(action => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${action.timestamp}</td>
                <td>${action.description} (You)</td>
            `;
            historyBody.appendChild(row);
        });

        // 공유된 다른 사용자 기록 표시
        sharedActions.forEach(action => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${action.timestamp}</td>
                <td>${action.description} (Shared)</td>
            `;
            historyBody.appendChild(row);
        });
    }

    function contributeToNetwork() {
        const startTime = Date.now();
        let contributionValue = Math.random() * 10;
        for (let i = 0; i < 100000; i++) {
            contributionValue += Math.sin(i) * 0.01;
        }
        const timeTaken = Date.now() - startTime;

        networkData.totalContributions += contributionValue;
        networkData.lastUpdated = new Date().toISOString();
        networkData.actions.push({
            timestamp: new Date().toLocaleString(),
            description: `Contributed ${contributionValue.toFixed(2)} units (${timeTaken}ms)`,
            contributionValue: contributionValue
        });

        if (networkData.actions.length > 50) {
            networkData.actions.shift();
        }

        localStorage.setItem('networkData', JSON.stringify(networkData));
        updateNetworkDisplay();

        console.log(`Contribution: ${contributionValue.toFixed(2)} units (${timeTaken}ms)`);
    }

    // 버튼 설정
    const contributeButton = document.getElementById('contributeButton');
    const shareButton = document.getElementById('shareButton');

    if (!contributeButton || !shareButton) {
        console.error('Buttons not found');
        return;
    }

    contributeButton.addEventListener('click', contributeToNetwork);

    shareButton.addEventListener('click', () => {
        const jsonData = JSON.stringify(networkData);
        const encodedData = btoa(encodeURIComponent(jsonData));
        const shareUrl = `${window.location.origin}${window.location.pathname}?data=${encodedData}`;
        navigator.clipboard.writeText(shareUrl).then(() => {
            alert('Share URL copied to clipboard!');
            console.log('Share URL:', shareUrl);
        }).catch(err => {
            console.error('Failed to copy URL:', err);
            alert('Failed to copy URL. Please copy it manually: ' + shareUrl);
        });
    });

    updateNetworkDisplay();
});
