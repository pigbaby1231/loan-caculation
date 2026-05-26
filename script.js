document.addEventListener('DOMContentLoaded', function () {
    const earlyRepayments = [];
    let currentAmortization = [];

    const amountInput = document.getElementById('amount');
    const interestInput = document.getElementById('interest');
    const periodsInput = document.getElementById('periods');
    const calculateButton = document.getElementById('calculate');
    const resultDiv = document.getElementById('result');

    const repaymentPeriodInput = document.getElementById('repayment-period');
    const repaymentAmountInput = document.getElementById('repayment-amount');
    const addRepaymentButton = document.getElementById('add-repayment');
    const repaymentList = document.getElementById('repayment-list');

    const modal = document.getElementById('amortization-modal');
    const closeModalBtn = document.getElementById('close-modal');
    const modalTableBody = document.getElementById('modal-table-body');

    closeModalBtn.addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });

    function openAmortizationModal() {
        const currentPeriod = earlyRepayments.length > 0
            ? earlyRepayments[earlyRepayments.length - 1].period
            : null;

        modalTableBody.innerHTML = '';
        let highlightedRow = null;
        currentAmortization.forEach(row => {
            const tr = document.createElement('tr');
            const isCurrentPeriod = row.period === currentPeriod;
            tr.className = `border-b ${isCurrentPeriod ? 'bg-yellow-200' : 'hover:bg-gray-50'}`;
            tr.innerHTML = `
                <td class="py-2 px-3 text-center border border-gray-200">${row.period}</td>
                <td class="py-2 px-3 text-right border border-gray-200">${Math.floor(row.monthlyPayment).toLocaleString()}</td>
                <td class="py-2 px-3 text-right border border-gray-200">${Math.floor(row.principalPayment).toLocaleString()}</td>
                <td class="py-2 px-3 text-right border border-gray-200">${Math.floor(row.interestPayment).toLocaleString()}</td>
                <td class="py-2 px-3 text-right border border-gray-200">${Math.floor(row.remainingBalance).toLocaleString()}</td>
            `;
            modalTableBody.appendChild(tr);
            if (isCurrentPeriod) highlightedRow = tr;
        });
        modal.classList.remove('hidden');
        if (highlightedRow) {
            setTimeout(() => highlightedRow.scrollIntoView({ block: 'center' }), 50);
        }
    }

    addRepaymentButton.addEventListener('click', function () {
        const period = parseInt(repaymentPeriodInput.value);
        const amount = parseFloat(repaymentAmountInput.value);

        if (period > 0 && amount > 0) {
            earlyRepayments.push({ period, amount });
            renderRepayments();
            repaymentPeriodInput.value = '';
            repaymentAmountInput.value = '';
        }
    });

    function renderRepayments() {
        repaymentList.innerHTML = '';
        earlyRepayments.forEach((repayment, index) => {
            const listItem = document.createElement('li');
            listItem.className = 'flex justify-between items-center bg-gray-200 p-2 rounded mb-2';
            listItem.innerHTML = `
                <span class="text-gray-700">第 ${repayment.period} 期: ${repayment.amount}</span>
                <button data-index="${index}" class="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded text-xs">刪除</button>
            `;
            repaymentList.appendChild(listItem);
        });
    }

    repaymentList.addEventListener('click', function (e) {
        if (e.target.tagName === 'BUTTON') {
            const index = e.target.getAttribute('data-index');
            earlyRepayments.splice(index, 1);
            renderRepayments();
        }
    });

    calculateButton.addEventListener('click', function () {
        const principal = parseFloat(amountInput.value);
        const calculatedInterest = parseFloat(interestInput.value) / 100 / 12;
        const calculatedPayments = parseFloat(periodsInput.value);

        if (isNaN(principal) || isNaN(calculatedInterest) || isNaN(calculatedPayments)) {
            resultDiv.innerHTML = '<p class="text-red-500">請檢查您輸入的數字</p>';
            return;
        }

        let monthlyPayment = (principal * calculatedInterest * Math.pow(1 + calculatedInterest, calculatedPayments)) / (Math.pow(1 + calculatedInterest, calculatedPayments) - 1);

        if (!isFinite(monthlyPayment)) {
            resultDiv.innerHTML = '<p class="text-red-500">請檢查您輸入的數字</p>';
            return;
        }

        let remainingBalance = principal;
        let totalInterest = 0;
        let totalPayment = 0;
        const amortization = [];
        let newMonthlyPayment = monthlyPayment;

        for (let i = 1; i <= calculatedPayments; i++) {
            let interestPayment = remainingBalance * calculatedInterest;
            let principalPayment = newMonthlyPayment - interestPayment;

            const earlyRepayment = earlyRepayments.find(r => r.period === i);
            let earlyRepaymentAmount = 0;
            if (earlyRepayment) {
                earlyRepaymentAmount = earlyRepayment.amount;
            }

            if (remainingBalance < (principalPayment + earlyRepaymentAmount)) {
                principalPayment = remainingBalance;
                earlyRepaymentAmount = 0; // No early repayment if it exceeds the balance
            }
            
            remainingBalance -= (principalPayment + earlyRepaymentAmount);
            totalInterest += interestPayment;
            totalPayment += newMonthlyPayment + earlyRepaymentAmount;

            amortization.push({
                period: i,
                monthlyPayment: newMonthlyPayment,
                principalPayment: principalPayment,
                interestPayment: interestPayment,
                earlyRepayment: earlyRepaymentAmount,
                remainingBalance: remainingBalance
            });

            if (earlyRepayment) {
                const remainingPeriods = calculatedPayments - i;
                if (remainingBalance > 0 && remainingPeriods > 0) {
                    newMonthlyPayment = (remainingBalance * calculatedInterest * Math.pow(1 + calculatedInterest, remainingPeriods)) / (Math.pow(1 + calculatedInterest, remainingPeriods) - 1);
                } else {
                    newMonthlyPayment = 0;
                }
            }
            
            if (remainingBalance <= 0) {
                totalPayment = amortization.reduce((acc, curr) => acc + curr.monthlyPayment + curr.earlyRepayment, 0);
                if(i < calculatedPayments){
                    totalPayment -= (newMonthlyPayment * (calculatedPayments - i));
                }
                break;
            }
        }

        const initialMonthlyPayment = Math.floor(monthlyPayment);
        const finalTotalPayment = Math.floor(totalPayment);
        const finalTotalInterest = Math.floor(totalInterest);
        const latestMonthlyPayment = Math.floor(amortization[amortization.length - 1].monthlyPayment);

        currentAmortization = amortization;

        let resultHTML = `
            <h2 class="text-xl font-bold mb-4">計算結果</h2>
            <div class="grid grid-cols-3 gap-4 text-center">
                <div>
                    <p class="text-gray-600">初始月付金</p>
                    <p class="text-2xl font-bold">${initialMonthlyPayment.toLocaleString()}</p>
                </div>
                <div>
                    <p class="text-gray-600">總付款金額</p>
                    <p class="text-2xl font-bold">${finalTotalPayment.toLocaleString()}</p>
                </div>
                <div>
                    <p class="text-gray-600">總利息</p>
                    <p class="text-2xl font-bold">${finalTotalInterest.toLocaleString()}</p>
                </div>
            </div>
            <div class="mt-4 p-3 bg-blue-50 rounded-lg text-center">
                <p class="text-gray-600 text-sm mb-1">最新月付金</p>
                <button id="open-amortization-modal" class="text-2xl font-bold text-blue-600 underline hover:text-blue-800 cursor-pointer bg-transparent border-none p-0">${latestMonthlyPayment.toLocaleString()}</button>
                <p class="text-xs text-gray-400 mt-1">點擊查看剩餘明細</p>
            </div>
        `;

        if (amortization.some(a => a.earlyRepayment > 0)) {
            resultHTML += '<h3 class="text-lg font-bold mt-6 mb-2">月付金變化</h3>';
            let lastMonthlyPayment = initialMonthlyPayment;
            amortization.forEach(a => {
                if (Math.floor(a.monthlyPayment) !== lastMonthlyPayment) {
                    resultHTML += `<p class="text-gray-700">第 ${a.period} 期起，月付金變為: <span class="font-bold">${Math.floor(a.monthlyPayment)}</span></p>`;
                    lastMonthlyPayment = Math.floor(a.monthlyPayment);
                }
            });
        }

        resultDiv.innerHTML = resultHTML;
        document.getElementById('open-amortization-modal').addEventListener('click', openAmortizationModal);
    });
});