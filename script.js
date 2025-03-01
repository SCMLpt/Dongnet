document.addEventListener('DOMContentLoaded', async () => {
    let web3;
    if (window.ethereum) {
        web3 = new Web3(window.ethereum);
        try {
            await window.ethereum.request({ method: 'eth_requestAccounts' });
            await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                    chainId: '0x118ad', // 71901 in hex
                    chainName: 'Dongnet',
                    rpcUrls: ['http://3.86.160.93:8545'],
                    nativeCurrency: { name: 'Dongnet', symbol: 'DNT', decimals: 18 }
                }]
            });
        } catch (error) {
            console.error('MetaMask connection failed:', error);
            alert('Please connect MetaMask to Dongnet!');
            return;
        }
    } else {
        alert('Please install MetaMask to use Dongnet!');
        return;
    }

    const contractAddress = '0x610d2ec9f017600b449cea92066aa75dbcb561fe';
    const withdrawalAddress = '0x9ce7FbFAe88Fd96bcae9b8880857A0F692dd6f19'; // 출금 주소
    const contractAbi = [
        {"inputs":[],"name":"contribute","outputs":[],"stateMutability":"payable","type":"function"},
        {"inputs":[],"name":"getContributions","outputs":[{"components":[{"internalType":"address","name":"contributor","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"uint256","name":"timestamp","type":"uint256"}],"internalType":"struct DongnetContribution.Contribution[]","name":"","type":"tuple[]"}],"stateMutability":"view","type":"function"},
        {"inputs":[],"name":"totalContributions","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
        {"inputs":[],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"},
        {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"contributor","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Contributed","type":"event"}
    ];
    const contract = new web3.eth.Contract(contractAbi, contractAddress);

    const contributeButton = document.getElementById('contributeButton');
    const shareButton = document.getElementById('shareButton');
    const totalContributionsElement = document.getElementById('totalContributions');
    const actionCountElement = document.getElementById('actionCount');
    const historyBody = document.getElementById('historyBody');

    if (!contributeButton || !shareButton || !totalContributionsElement || !actionCountElement || !historyBody) {
        console.error('Required elements not found');
        return;
    }

    let lastContributeTime = 0; // 마지막 기여 시간 추적
    const contributionThreshold = web3.utils.toWei('0.5', 'ether'); // 0.5 DNT
    const contributionAmount = web3.utils.toWei('0.001', 'ether'); // 0.001 DNT

    async function updateNetworkDisplay() {
        try {
            const total = await contract.methods.totalContributions().call();
            const contributions = await contract.methods.getContributions().call();

            totalContributionsElement.textContent = web3.utils.fromWei(total, 'ether');
            actionCountElement.textContent = contributions.length;
            historyBody.innerHTML = '';

            contributions.forEach(c => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${new Date(c.timestamp * 1000).toLocaleString()}</td>
                    <td>${web3.utils.fromWei(c.value, 'ether')} DNT</td>
                `;
                historyBody.appendChild(row);
            });

            // 총 기여량 체크 및 0.5 DNT 이상일 때 출금
            if (parseFloat(total) >= parseFloat(contributionThreshold)) {
                const accounts = await web3.eth.getAccounts();
                await withdrawToUser(accounts[0]);
            }
        } catch (error) {
            console.error('Failed to update display:', error);
        }
    }

    async function withdrawToUser(userAddress) {
        try {
            // 지정된 주소에서 사용자 주소로 0.5 DNT 전송
            await web3.eth.sendTransaction({
                from: withdrawalAddress,
                to: userAddress,
                value: contributionThreshold // 0.5 DNT
            });
            console.log(`Successfully transferred 0.5 DNT to ${userAddress}`);
            alert('0.5 DNT has been transferred to your address!');
        } catch (error) {
            console.error('Withdrawal failed:', error);
            alert('Failed to withdraw 0.5 DNT. Check console for details.');
        }
    }

    contributeButton.addEventListener('click', async () => {
        const currentTime = Date.now();
        if (currentTime - lastContributeTime < 1000) { // 1초 제한
            alert('Please wait 1 second between contributions!');
            return;
        }

        const accounts = await web3.eth.getAccounts();
        try {
            await contract.methods.contribute().send({ from: accounts[0], value: contributionAmount });
            console.log('Contribution successful: 0.001 DNT');
            lastContributeTime = currentTime; // 마지막 기여 시간 업데이트
            updateNetworkDisplay();
        } catch (error) {
            console.error('Contribution failed:', error);
            alert('Failed to contribute. Check MetaMask and console.');
        }
    });

    shareButton.addEventListener('click', async () => {
        const contributions = await contract.methods.getContributions().call();
        const shareData = {
            participantId: web3.utils.toHex(await web3.eth.getChainId()),
            totalContributions: web3.utils.fromWei(await contract.methods.totalContributions().call(), 'ether'),
            actions: contributions.map(c => ({
                timestamp: new Date(c.timestamp * 1000).toLocaleString(),
                description: `${web3.utils.fromWei(c.value, 'ether')} DNT`
            }))
        };
        const jsonData = JSON.stringify(shareData);
        const encodedData = btoa(encodeURIComponent(jsonData));
        const shareUrl = `${window.location.origin}${window.location.pathname}?data=${encodedData}`;
        navigator.clipboard.writeText(shareUrl).then(() => {
            alert('Share URL copied to clipboard!');
            console.log('Share URL:', shareUrl);
        }).catch(err => {
            console.error('Failed to copy URL:', err);
            alert('Failed to copy URL. Copy manually: ' + shareUrl);
        });
    });

    updateNetworkDisplay();
});
