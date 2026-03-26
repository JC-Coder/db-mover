import { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { motion } from "framer-motion";
import {
  TrendingUp,
  Database,
  CheckCircle2,
  HardDrive,
  Download,
  Calendar,
  Layers,
  Clock,
  ArrowUpRight,
  Zap,
} from "lucide-react";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subValue?: string;
  color?: "indigo" | "blue" | "green" | "purple" | "orange" | "cyan";
  fullWidth?: boolean;
}

const StatCard = ({
  icon,
  label,
  value,
  subValue,
  color = "indigo",
  fullWidth,
}: StatCardProps) => {
  const colorClasses = {
    indigo: "from-indigo-500/20 to-indigo-600/5 border-indigo-500/30",
    blue: "from-blue-500/20 to-blue-600/5 border-blue-500/30",
    green: "from-green-500/20 to-green-600/5 border-green-500/30",
    purple: "from-purple-500/20 to-purple-600/5 border-purple-500/30",
    orange: "from-orange-500/20 to-orange-600/5 border-orange-500/30",
    cyan: "from-cyan-500/20 to-cyan-600/5 border-cyan-500/30",
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={`glass-card p-5 sm:p-6 rounded-2xl border bg-gradient-to-br ${colorClasses[color]} ${fullWidth ? "md:col-span-2" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-white/60 text-sm font-medium mb-2 uppercase tracking-wider">
            {label}
          </p>
          <div className="flex items-baseline gap-3 flex-wrap">
            <p className="text-2xl sm:text-3xl font-bold text-white">{value}</p>
          </div>
          {subValue && (
            <p className="text-xs text-white/40 mt-2 font-medium">{subValue}</p>
          )}
        </div>
        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
          {icon}
        </div>
      </div>
    </motion.div>
  );
};

type TimeRange = "7d" | "30d" | "90d" | "1y";

const ActivityChart = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");

  const data = useMemo(() => {
    let days = 30;
    if (timeRange === "7d") days = 7;
    if (timeRange === "90d") days = 90;
    if (timeRange === "1y") days = 365;

    const result = [];
    const now = new Date();
    // Simulate some somewhat realistic upward-trending or wavy data
    let baseValue = 50;
    for (let i = days; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);

      baseValue = Math.max(10, baseValue + (Math.random() - 0.45) * 20);

      result.push({
        date: date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        migrations: Math.round(baseValue),
      });
    }
    return result;
  }, [timeRange]);

  const ranges: { label: string; shortLabel: string; value: TimeRange }[] = [
    { label: "Last 7 Days", shortLabel: "7D", value: "7d" },
    { label: "Last Month", shortLabel: "1M", value: "30d" },
    { label: "Last 3 Months", shortLabel: "3M", value: "90d" },
    { label: "Last Year", shortLabel: "1Y", value: "1y" },
  ];

  return (
    <div className="glass-card p-4 sm:p-6 md:p-8 rounded-2xl border border-white/[0.05] w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-white/70" />
          <h2 className="text-lg sm:text-xl font-bold text-white">
            Migration Activity
          </h2>
        </div>

        <div className="grid grid-cols-4 sm:flex bg-white/5 p-1 rounded-lg border border-white/10 w-full sm:w-auto gap-1">
          {ranges.map((range) => (
            <button
              key={range.value}
              onClick={() => setTimeRange(range.value)}
              className={`px-2 sm:px-4 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors text-center whitespace-nowrap ${
                timeRange === range.value
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              <span className="sm:hidden">{range.shortLabel}</span>
              <span className="hidden sm:inline">{range.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="h-[240px] sm:h-[300px] w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorMigrations" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.05)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              stroke="rgba(255,255,255,0.3)"
              fontSize={12}
              tickMargin={10}
              minTickGap={30}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              stroke="rgba(255,255,255,0.3)"
              fontSize={12}
              tickMargin={10}
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `${value}`}
            />
            <RechartsTooltip
              contentStyle={{
                backgroundColor: "rgba(15, 23, 42, 0.9)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                color: "#fff",
              }}
              itemStyle={{ color: "#6366f1" }}
            />
            <Area
              type="monotone"
              dataKey="migrations"
              stroke="#6366f1"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorMigrations)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const DbDistribution = () => {
  const dbs = [
    { name: "PostgreSQL", value: 45, color: "bg-blue-500" },
    { name: "MongoDB", value: 30, color: "bg-green-500" },
    { name: "MySQL", value: 15, color: "bg-orange-500" },
    { name: "Redis", value: 10, color: "bg-red-500" },
  ];

  return (
    <div className="glass-card p-4 sm:p-6 md:p-8 rounded-2xl border border-white/[0.05] h-full flex flex-col justify-between">
      <div className="flex items-center gap-3 mb-6">
        <Database className="h-5 w-5 text-indigo-400" />
        <h2 className="text-lg sm:text-xl font-bold text-white">
          Database Distribution
        </h2>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        <div className="flex h-4 w-full rounded-full overflow-hidden mb-6">
          {dbs.map((db, i) => (
            <div
              key={i}
              style={{ width: `${db.value}%` }}
              className={`h-full ${db.color}`}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {dbs.map((db, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${db.color}`} />
              <span className="text-white/80 text-sm font-medium">
                {db.name}
              </span>
              <span className="text-white/40 text-xs ml-auto">{db.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ActionSplit = () => {
  return (
    <div className="glass-card p-4 sm:p-6 md:p-8 rounded-2xl border border-white/[0.05] flex flex-col justify-between h-full">
      <div className="flex items-center gap-3 mb-6">
        <Layers className="h-5 w-5 text-purple-400" />
        <h2 className="text-lg sm:text-xl font-bold text-white">
          Migration Method
        </h2>
      </div>

      <div className="space-y-4 flex-1">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4 relative overflow-hidden group cursor-pointer"
        >
          <div className="absolute left-0 top-0 bottom-0 bg-purple-500/10 w-[65%] -z-10 group-hover:bg-purple-500/20 transition-colors duration-500" />

          <div className="p-3 rounded-lg bg-purple-500/20 border border-purple-500/20 text-purple-400">
            <Zap className="h-6 w-6" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-bold text-white truncate">Direct Transfer</h3>
              <span className="text-purple-400 font-bold bg-purple-500/10 px-2 py-0.5 rounded text-sm">
                65%
              </span>
            </div>
            <p className="text-xs text-white/50 truncate">
              Live database-to-database sync
            </p>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4 relative overflow-hidden group cursor-pointer"
        >
          <div className="absolute left-0 top-0 bottom-0 bg-blue-500/10 w-[35%] -z-10 group-hover:bg-blue-500/20 transition-colors duration-500" />

          <div className="p-3 rounded-lg bg-blue-500/20 border border-blue-500/20 text-blue-400">
            <Download className="h-6 w-6" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-1">
              <h3 className="font-bold text-white truncate">Offline Backup</h3>
              <span className="text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded text-sm">
                35%
              </span>
            </div>
            <p className="text-xs text-white/50 truncate">
              Export to JSON/CSV/SQL file
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export function StatsPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 max-w-7xl pt-8 sm:pt-12 pb-16 sm:pb-24">
      {/* Coming Soon Sticky Overlay */}
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/5 backdrop-blur" />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="relative z-10 glass-card p-8 md:p-12 text-center max-w-lg mx-4 border border-white/20 shadow-2xl"
        >
          <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-indigo-500/30 shadow-[0_0_30px_-5px_theme(colors.indigo.500/0.3)]">
            <TrendingUp className="w-10 h-10 text-indigo-400" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Coming Soon
          </h2>
          <p className="text-white/60 text-lg leading-relaxed mb-8">
            We're actively working on bringing you real-time community metrics.
            Soon you'll see live migration stats, data volume tracked, and
            success rates from our global open source community.
          </p>

          <div className="flex flex-col gap-3">
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-indigo-500"
                initial={{ width: "0%" }}
                animate={{ width: "65%" }}
                transition={{ duration: 1.5, ease: "circOut", delay: 0.5 }}
              />
            </div>
            <div className="flex justify-between text-xs text-white/40 font-medium px-1">
              <span>Progress</span>
              <span>65% Complete</span>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div
        key="stats-v2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.65 }}
        className="space-y-10 pointer-events-none select-none filter blur-[2px] grayscale-[0.2]"
      >
        {/* Header */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-4"
        >
          <motion.div variants={itemVariants}>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gradient">
              Community Metrics
            </h1>
            <p className="text-white/60 text-base sm:text-lg mt-2 max-w-2xl">
              Tracking the global impact of DB Mover. Aggregated, anonymized
              statistics from our open source community.
            </p>
          </motion.div>
        </motion.div>

        {/* Activity Chart */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants}>
            <ActivityChart />
          </motion.div>
        </motion.div>

        {/* Key Metrics Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {/* Row 1 */}
          <motion.div variants={itemVariants}>
            <StatCard
              icon={<TrendingUp className="h-5 w-5 text-indigo-400" />}
              label="Migrations Completed"
              value="24,392"
              subValue="+1,204 this week"
              color="indigo"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard
              icon={<HardDrive className="h-5 w-5 text-blue-400" />}
              label="Data Moved"
              value="4.8 PB"
              subValue="Combined upload & transfer"
              color="blue"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard
              icon={<Download className="h-5 w-5 text-cyan-400" />}
              label="Total Downloaded"
              value="1.2 PB"
              subValue="Local dumps created"
              color="cyan"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard
              icon={<Layers className="h-5 w-5 text-purple-400" />}
              label="Records Processed"
              value="842 B"
              subValue="Individual documents/rows"
              color="purple"
            />
          </motion.div>

          {/* Row 2 */}
          <motion.div variants={itemVariants}>
            <StatCard
              icon={<CheckCircle2 className="h-5 w-5 text-green-400" />}
              label="Success Rate"
              value="99.42%"
              subValue="Across all environments"
              color="green"
            />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard
              icon={<Clock className="h-5 w-5 text-orange-400" />}
              label="Avg Duration"
              value="18m 42s"
              subValue="Per 100GB segment"
              color="orange"
            />
          </motion.div>

          <motion.div variants={itemVariants} className="md:col-span-2">
            <StatCard
              icon={<ArrowUpRight className="h-5 w-5 text-emerald-400" />}
              label="Largest Single Migration"
              value="84 TB"
              subValue="PostgreSQL → BigQuery (Completed in 14h)"
              color="green"
              fullWidth
            />
          </motion.div>
        </motion.div>

        {/* Charts Section */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8"
        >
          <motion.div variants={itemVariants}>
            <DbDistribution />
          </motion.div>
          <motion.div variants={itemVariants}>
            <ActionSplit />
          </motion.div>
        </motion.div>

        {/* Footer Note */}
        <motion.div
          variants={itemVariants}
          className="text-center pt-8 border-t border-white/[0.05]"
        >
          <p className="text-white/30 text-xs">
            Data is refreshed every 5 minutes. Last updated: Just now
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
