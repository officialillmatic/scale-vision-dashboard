// 👤 RENDER REGULAR USER DASHBOARD (LAYOUT CORREGIDO)
  const regularChartData = getChartData();
  const sentimentData = getSentimentData();

  return (
    <DashboardLayout>
      {/* ✅ CONTENEDOR PRINCIPAL CON ESPACIADO MEJORADO */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        
        {/* ✅ SECCIÓN 1: CREDIT BALANCE - PROMINENTE Y BIEN ESPACIADO */}
        <div className="w-full">
          <CreditBalance 
            onRequestRecharge={() => {
              alert('Please contact support to recharge your account: support@drscaleai.com');
            }}
            showActions={true}
          />
        </div>

        {/* ✅ SECCIÓN 2: HEADER DEL DASHBOARD - ORGANIZADO */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight">
              📊 Dashboard
            </h1>
            <p className="text-gray-600 text-lg">
              Real-time analytics for your AI call system
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 px-3 py-1">
              <Activity className="w-4 h-4 mr-2" />
              Live Data
            </Badge>
            
            <Button
              onClick={() => {
                fetchCallsData();
                if (user?.id) refreshCreditBalance(user.id);
              }}
              disabled={loading}
              variant="outline"
              size="default"
              className="px-4 py-2"
            >
              {loading ? <LoadingSpinner size="sm" /> : "🔄"} Refresh Data
            </Button>
          </div>
        </div>

        {/* ✅ SECCIÓN 3: ERROR ALERT - MEJORADO */}
        {error && (
          <Card className="border-red-200 bg-red-50 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-red-600 text-lg">❌</span>
                </div>
                <p className="text-red-800 font-medium">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}
        {/* ✅ SECCIÓN 4: MÉTRICAS PRINCIPALES - GRID MEJORADO */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          
          {/* Tarjeta 1: Total Calls */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100 hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-blue-600/80 uppercase tracking-wide">
                    Total Calls
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats.totalCalls.toLocaleString()}
                  </p>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center text-green-600">
                      <TrendingUp className="w-4 h-4 mr-1" />
                      <span className="text-sm font-semibold">+{stats.callsToday}</span>
                    </div>
                    <span className="text-xs text-gray-600">today</span>
                  </div>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Phone className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tarjeta 2: Success Rate */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 via-green-50 to-green-100 hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-green-600/80 uppercase tracking-wide">
                    Success Rate
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats.successRate.toFixed(1)}%
                  </p>
                  <div className="flex items-center space-x-2">
                    {stats.successRate >= 80 ? (
                      <div className="flex items-center text-green-600">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        <span className="text-sm font-semibold">Excellent</span>
                      </div>
                    ) : stats.successRate >= 60 ? (
                      <div className="flex items-center text-yellow-600">
                        <Target className="w-4 h-4 mr-1" />
                        <span className="text-sm font-semibold">Good</span>
                      </div>
                    ) : (
                      <div className="flex items-center text-red-600">
                        <TrendingDown className="w-4 h-4 mr-1" />
                        <span className="text-sm font-semibold">Needs Improvement</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-3 bg-green-100 rounded-xl">
                  <TrendingUp className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tarjeta 3: Total Cost */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 via-purple-50 to-purple-100 hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-purple-600/80 uppercase tracking-wide">
                    Total Cost
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatCurrency(stats.totalCost)}
                  </p>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center text-purple-600">
                      <DollarSign className="w-4 h-4 mr-1" />
                      <span className="text-sm font-semibold">{formatCurrency(stats.costToday)}</span>
                    </div>
                    <span className="text-xs text-gray-600">today</span>
                  </div>
                </div>
                <div className="p-3 bg-purple-100 rounded-xl">
                  <DollarSign className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tarjeta 4: Average Duration */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 via-orange-50 to-orange-100 hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-orange-600/80 uppercase tracking-wide">
                    Avg Duration
                  </p>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatDuration(stats.avgDuration)}
                  </p>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center text-orange-600">
                      <Clock className="w-4 h-4 mr-1" />
                      <span className="text-sm font-semibold">Per call</span>
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-orange-100 rounded-xl">
                  <Clock className="h-8 w-8 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        {/* ✅ SECCIÓN 5: GRÁFICOS PRINCIPALES - LAYOUT MEJORADO */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Gráfico 1: Call Activity - Rediseñado */}
          <Card className="border-0 shadow-lg bg-white hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                  </div>
                  Call Activity
                </CardTitle>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  Last 7 Days
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Daily call volume and performance trends
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={regularChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <defs>
                      <linearGradient id="callGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#64748b" 
                      fontSize={12}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="#64748b" 
                      fontSize={12}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        fontSize: '14px',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                      }}
                      labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="calls" 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 5 }}
                      activeDot={{ r: 7, fill: '#1d4ed8' }}
                      fill="url(#callGradient)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              
              {/* Métricas adicionales del gráfico */}
              <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-gray-100">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {regularChartData.reduce((sum, day) => sum + day.calls, 0)}
                  </p>
                  <p className="text-xs text-gray-600 uppercase tracking-wide">Total This Week</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {regularChartData.length > 0 ? Math.max(...regularChartData.map(d => d.calls)) : 0}
                  </p>
                  <p className="text-xs text-gray-600 uppercase tracking-wide">Peak Day</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {regularChartData.length > 0 ? (regularChartData.reduce((sum, day) => sum + day.calls, 0) / regularChartData.length).toFixed(1) : 0}
                  </p>
                  <p className="text-xs text-gray-600 uppercase tracking-wide">Daily Average</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gráfico 2: Sentiment Analysis - Rediseñado */}
          <Card className="border-0 shadow-lg bg-white hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Zap className="h-5 w-5 text-purple-600" />
                  </div>
                  Sentiment Analysis
                </CardTitle>
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                  All Calls
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Customer sentiment distribution across conversations
              </p>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-80 w-full">
                {sentimentData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <defs>
                        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                          <dropShadow dx="2" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.1"/>
                        </filter>
                      </defs>
                      <Pie
                        data={sentimentData}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        innerRadius={40}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                        filter="url(#shadow)"
                      >
                        {sentimentData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.color}
                            stroke="#fff"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          fontSize: '14px',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <Zap className="h-12 w-12 mb-4 opacity-50" />
                    <p className="text-lg font-medium">No sentiment data available</p>
                    <p className="text-sm">Complete some calls to see sentiment analysis</p>
                  </div>
                )}
              </div>
              
              {/* Sentiment Summary */}
              <div className="mt-6 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-green-600">
                      {stats.positiveRatio.toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-600 font-medium">Positive Sentiment</p>
                  </div>
                  <div className="flex items-center space-x-4">
                    {sentimentData.map((item, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        ></div>
                        <span className="text-sm text-gray-600">{item.name}: {item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        {/* ✅ SECCIÓN 6: COST ANALYSIS - GRÁFICO COMPLETO MEJORADO */}
        <Card className="border-0 shadow-lg bg-white hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-600" />
                </div>
                Cost Analysis
              </CardTitle>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                Last 7 Days
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Daily spending breakdown and cost optimization insights
            </p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={regularChartData} 
                  margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                >
                  <defs>
                    <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.3}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#64748b" 
                    fontSize={12}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="#64748b" 
                    fontSize={12}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `$${value.toFixed(2)}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      fontSize: '14px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value) => [formatCurrency(Number(value)), 'Cost']}
                    labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                  />
                  <Bar 
                    dataKey="cost" 
                    fill="url(#costGradient)" 
                    radius={[8, 8, 0, 0]}
                    stroke="#059669"
                    strokeWidth={1}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Cost Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6 pt-4 border-t border-gray-100">
              <div className="text-center p-4 bg-green-50 rounded-xl">
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(regularChartData.reduce((sum, day) => sum + day.cost, 0))}
                </p>
                <p className="text-xs text-gray-600 uppercase tracking-wide mt-1">Total This Week</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-xl">
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(regularChartData.length > 0 ? Math.max(...regularChartData.map(d => d.cost)) : 0)}
                </p>
                <p className="text-xs text-gray-600 uppercase tracking-wide mt-1">Highest Day</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-xl">
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(regularChartData.length > 0 ? (regularChartData.reduce((sum, day) => sum + day.cost, 0) / regularChartData.length) : 0)}
                </p>
                <p className="text-xs text-gray-600 uppercase tracking-wide mt-1">Daily Average</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-xl">
                <p className="text-2xl font-bold text-orange-600">
                  {stats.totalCalls > 0 ? formatCurrency(stats.totalCost / stats.totalCalls) : '$0.00'}
                </p>
                <p className="text-xs text-gray-600 uppercase tracking-wide mt-1">Cost Per Call</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ✅ SECCIÓN 7: QUICK STATS - TARJETAS FINALES REDISEÑADAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Quick Stat 1: Total Conversations */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-50 via-indigo-50 to-indigo-100 hover:shadow-xl transition-all duration-300 group">
            <CardContent className="p-6 text-center">
              <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Users className="h-8 w-8 text-indigo-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-2">
                {stats.totalCalls.toLocaleString()}
              </p>
              <p className="text-sm font-medium text-indigo-600 uppercase tracking-wider">
                Total Conversations
              </p>
              <div className="mt-3 pt-3 border-t border-indigo-200">
                <p className="text-xs text-gray-600">
                  Across all time periods
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stat 2: Total Talk Time */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-pink-50 via-pink-50 to-pink-100 hover:shadow-xl transition-all duration-300 group">
            <CardContent className="p-6 text-center">
              <div className="mx-auto w-16 h-16 bg-pink-100 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Target className="h-8 w-8 text-pink-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-2">
                {formatDuration(stats.totalDuration)}
              </p>
              <p className="text-sm font-medium text-pink-600 uppercase tracking-wider">
                Total Talk Time
              </p>
              <div className="mt-3 pt-3 border-t border-pink-200">
                <p className="text-xs text-gray-600">
                  {(stats.totalDuration / 3600).toFixed(1)} hours total
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stat 3: Recorded Calls */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-teal-50 via-teal-50 to-teal-100 hover:shadow-xl transition-all duration-300 group">
            <CardContent className="p-6 text-center">
              <div className="mx-auto w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <Activity className="h-8 w-8 text-teal-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-2">
                {calls.filter(call => call.recording_url).length.toLocaleString()}
              </p>
              <p className="text-sm font-medium text-teal-600 uppercase tracking-wider">
                Recorded Calls
              </p>
              <div className="mt-3 pt-3 border-t border-teal-200">
                <p className="text-xs text-gray-600">
                  {stats.totalCalls > 0 ? 
                    `${((calls.filter(call => call.recording_url).length / stats.totalCalls) * 100).toFixed(1)}% recorded` 
                    : '0% recorded'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ✅ SECCIÓN 8: FOOTER MEJORADO */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="text-center space-y-3">
            <p className="text-sm text-gray-500">
              Dashboard automatically updates every 5 minutes
            </p>
            <div className="flex items-center justify-center space-x-4 text-xs text-gray-400">
              <span>Last updated: {new Date().toLocaleTimeString()}</span>
              <span>•</span>
              <span>Real-time data</span>
              <span>•</span>
              <span>Version 2.0</span>
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
