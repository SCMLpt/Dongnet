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
                    rpcUrls: ['http://localhost:8545'], // 배포 시 공용 IP로 변경
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

    const contractAddress = '0x610d2ec9f017600b449cea92066aa75dbcb561fe'; // 새로운 배포 주소
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
        } catch (error) {
            console.error('Failed to update display:', error);
        }
    }

    contributeButton.addEventListener('click', async () => {
        const accounts = await web3.eth.getAccounts();
        const value = web3.utils.toWei('1', 'ether'); // 1 DNT 기여
        try {
            await contract.methods.contribute().send({ from: accounts[0], value: value });
            console.log('Contribution successful: 1 DNT');
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
