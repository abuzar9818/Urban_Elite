const userModel = require("../models/user-model");

async function calculateSalesData() {
    const users = await userModel.find({});
    
    let totalOrders = 0;
    let todayOrdersCount = 0;
    let todaySales = 0;
    let weekSales = 0;
    let monthSales = 0;
    let totalSales = 0;
    
    const allOrders = [];
    const productSales = {}; // To track top products

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Initialize daily trend for last 7 days
    const dailyTrend = {};
    for (let i = 0; i < 7; i++) {
        const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
        dailyTrend[d.toDateString()] = 0;
    }

    users.forEach(user => {
        if (user.orders && user.orders.length > 0) {
            user.orders.forEach(order => {
                const orderDate = new Date(order.date);
                const orderTotal = Number(order.total) || 0;
                
                totalOrders++;
                totalSales += orderTotal;

                // Track all orders for "Recent Orders"
                allOrders.push({
                    orderId: order.orderId || `ORD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
                    customer: user.fullName || user.email,
                    amount: orderTotal,
                    date: orderDate,
                    status: "Completed", // Defaulting to completed for now as per current schema
                    items: order.items || []
                });

                // Today's Sales
                if (orderDate >= today) {
                    todaySales += orderTotal;
                    todayOrdersCount++;
                }

                // Week Sales (Last 7 days)
                if (orderDate >= sevenDaysAgo) {
                    weekSales += orderTotal;
                    const dateStr = orderDate.toDateString();
                    if (dailyTrend[dateStr] !== undefined) {
                        dailyTrend[dateStr] += orderTotal;
                    }
                }

                // Month Sales
                if (orderDate >= thisMonthStart) {
                    monthSales += orderTotal;
                }

                // Track Top Products
                if (order.items && Array.isArray(order.items)) {
                    order.items.forEach(item => {
                        const productId = item.productId || item._id;
                        if (productId) {
                            if (!productSales[productId]) {
                                productSales[productId] = {
                                    name: item.name,
                                    sales: 0,
                                    revenue: 0
                                };
                            }
                            productSales[productId].sales += (item.quantity || 1);
                            productSales[productId].revenue += (Number(item.price) || 0) * (item.quantity || 1);
                        }
                    });
                }
            });
        }
    });

    // Sort recent orders by date
    allOrders.sort((a, b) => b.date - a.date);

    // Sort top products by revenue
    const topProducts = Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

    // Prepare weekly trend data for Chart.js
    const weeklyTrendLabels = [];
    const weeklyTrendData = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
        weeklyTrendLabels.push(dayNames[d.getDay()]);
        weeklyTrendData.push(dailyTrend[d.toDateString()] || 0);
    }

    return {
        todaySales,
        weekSales,
        monthSales,
        totalOrders,
        todayOrders: todayOrdersCount,
        avgOrderValue: totalOrders > 0 ? Math.floor(totalSales / totalOrders) : 0,
        recentOrders: allOrders.slice(0, 15).map(o => ({
            ...o,
            date: o.date.toLocaleDateString()
        })),
        topProducts,
        weeklyTrend: {
            labels: weeklyTrendLabels,
            data: weeklyTrendData
        }
    };
}

module.exports = { calculateSalesData };
