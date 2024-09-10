if (typeof Vue === 'undefined') {
    console.error('Vue is not loaded. Please check your internet connection and try again.');
} else {
    const { createApp, ref, computed, onMounted, watch } = Vue;

    createApp({
        setup() {
            const exchangeRate = ref(0), sgdAmount = ref(''), myrAmount = ref(''), usingFallbackRate = ref(false), historicalRates = ref([]), loadingHistoricalRates = ref(true), historicalRatesError = ref('');
            let chart = null;
            const fallbackRates = { MYR: 3.11 };
            const sortedRates = computed(() => [...historicalRates.value].sort((a, b) => new Date(b.date) - new Date(a.date)));
            const fetchExchangeRate = async () => {
                try {
                    const response = await fetch('https://latest.currency-api.pages.dev/v1/currencies/sgd.json');
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    const data = await response.json();
                    exchangeRate.value = data.sgd.myr.toFixed(4);
                    usingFallbackRate.value = false;
                } catch (error) {
                    console.error('Error fetching exchange rate:', error);
                    try {
                        const fallbackResponse = await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/sgd.json');
                        if (!fallbackResponse.ok) throw new Error(`HTTP error! status: ${fallbackResponse.status}`);
                        const fallbackData = await fallbackResponse.json();
                        exchangeRate.value = fallbackData.sgd.myr.toFixed(4);
                        usingFallbackRate.value = true;
                    } catch (fallbackError) {
                        console.error('Error fetching fallback exchange rate:', fallbackError);
                        exchangeRate.value = fallbackRates.MYR.toFixed(4);
                        usingFallbackRate.value = true;
                    }
                }
            };
            const fetchHistoricalRates = async () => {
                loadingHistoricalRates.value = true;
                historicalRatesError.value = '';
                const rates = [];
                const today = new Date();
                const fetchPromises = [];
                for (let i = 13; i >= 0; i--) {
                    const date = new Date(today);
                    date.setDate(date.getDate() - i);
                    const formattedDate = date.toISOString().split('T')[0];
                    fetchPromises.push(
                        fetch(`https://${formattedDate}.currency-api.pages.dev/v1/currencies/sgd.json`)
                            .then(response => {
                                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                                return response.json();
                            })
                            .then(data => rates.push({ date: formattedDate, rate: data.sgd.myr }))
                            .catch(async error => {
                                console.error(`Error fetching historical rate for ${formattedDate}:`, error);
                                try {
                                    const fallbackResponse = await fetch(`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${formattedDate}/v1/currencies/sgd.json`);
                                    if (!fallbackResponse.ok) throw new Error(`HTTP error! status: ${fallbackResponse.status}`);
                                    const fallbackData = await fallbackResponse.json();
                                    rates.push({ date: formattedDate, rate: fallbackData.sgd.myr });
                                } catch (fallbackError) {
                                    console.error(`Error fetching fallback historical rate for ${formattedDate}:`, fallbackError);
                                    historicalRatesError.value = 'Failed to load some historical rates. Data may be incomplete.';
                                }
                            })
                    );
                }
                await Promise.all(fetchPromises);
                historicalRates.value = rates;
                loadingHistoricalRates.value = false;
                updateChart();
            };
            const updateChart = () => {
                const ctx = document.getElementById('historicalChart');
                const sortedData = [...historicalRates.value].sort((a, b) => new Date(a.date) - new Date(b.date));
                const labels = sortedData.map(entry => new Date(entry.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }));
                const data = sortedData.map(entry => entry.rate);
                if (chart) chart.destroy();
                chart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'SGD to MYR Rate',
                            data: data,
                            borderColor: 'rgb(75, 192, 192)',
                            tension: 0.1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: { y: { beginAtZero: false } },
                        plugins: { legend: { display: false } }
                    }
                });
            };
            const convertCurrency = () => myrAmount.value = (sgdAmount.value * exchangeRate.value).toFixed(2);
            const faqItems = ref([
                { question: "How often are the exchange rates updated?", answer: "Our live exchange rates are updated every minute to ensure you have the most current information.", isOpen: false },
                { question: "Where do you source your exchange rates?", answer: "We use reputable currency exchange APIs to fetch our rates, ensuring accuracy and reliability.", isOpen: false },
                { question: "Why do I see a 'fallback rate' message sometimes?", answer: "If we're unable to fetch the latest rates from our primary source, we use a fallback rate to ensure the converter remains functional. This rate may not be as current as our real-time rates.", isOpen: false },
                { question: "How far back does the historical data go?", answer: "Our historical data shows the SGD to MYR exchange rates for the past 14 days.", isOpen: false }
            ]);
            const localBanks = ref([
                { name: "DBS Bank", description: "DBS offers competitive exchange rates for SGD to MYR conversion.", link: "https://www.dbs.com.sg/personal/rates-online/foreign-currency-foreign-exchange.page", points: ["Currency exchange available at DBS/POSB branches", "Online currency exchange for DBS account holders", "Preferential rates for DBS Treasures customers"] },
                { name: "OCBC Bank", description: "OCBC provides currency exchange services with real-time rates.", link: "https://www.ocbc.com/personal-banking/investments/forex-trading.page", points: ["Exchange at OCBC branches or via online banking", "Special rates for Premier Banking customers", "Multi-currency account options available"] },
                { name: "UOB", description: "UOB offers foreign exchange services for various currencies including MYR.", link: "https://www.uob.com.sg/online-rates/foreign-exchange-rates-against-singapore-dollar.page", points: ["Currency exchange at UOB branches", "Privilege Banking customers may enjoy better rates", "Online currency exchange for UOB account holders"] },
                { name: "Maybank Singapore", description: "As a Malaysian bank with operations in Singapore, Maybank often offers competitive rates for MYR.", link: "https://sslsecure.maybank.com.sg/cgi-bin/mbs/JSPscripts/mbb_rates/fx_rate.jsp", points: ["Exchange SGD to MYR at Maybank branches", "Potentially better rates due to direct Malaysian connection", "Online remittance services available"] },
                { name: "CIMB Bank", description: "CIMB Bank Singapore provides competitive exchange rates for SGD to MYR.", link: "https://www.cimbclicks.com.sg/sgd-to-myr", points: ["Currency exchange services at CIMB branches", "Online foreign exchange for CIMB account holders", "Special rates for CIMB Preferred customers"] }
            ]);
            const toggleFAQ = index => faqItems.value[index].isOpen = !faqItems.value[index].isOpen;
            watch(sgdAmount, newValue => {
                if (newValue !== '') convertCurrency();
                else myrAmount.value = '';
            });
            onMounted(() => {
                fetchExchangeRate();
                fetchHistoricalRates();
                setInterval(fetchExchangeRate, 60000);
            });
            return {
                exchangeRate, sgdAmount, myrAmount, usingFallbackRate, convertCurrency, faqItems, toggleFAQ, sortedRates, loadingHistoricalRates, historicalRatesError, formatDate: dateString => new Date(dateString).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }), localBanks
            };
        }
    }).mount('#app');
}