import { Globe, TrendingUp, TrendingDown, Minus, AlertTriangle, Newspaper, Scale, BarChart2, MessageCircle } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { environmentSignals } from '../data/mockData';

const impactIcon = {
  positive: <TrendingUp className="w-4 h-4 text-emerald-400" />,
  negative: <TrendingDown className="w-4 h-4 text-red-400" />,
  neutral: <Minus className="w-4 h-4 text-gray-400" />,
};

const typeIcon: Record<string, React.ReactNode> = {
  market: <BarChart2 className="w-4 h-4 text-sky-400" />,
  competition: <AlertTriangle className="w-4 h-4 text-amber-400" />,
  regulation: <Scale className="w-4 h-4 text-red-400" />,
  sentiment: <MessageCircle className="w-4 h-4 text-cyan-400" />,
  macro: <Newspaper className="w-4 h-4 text-emerald-400" />,
};

const typeColor: Record<string, string> = {
  market: 'bg-sky-500/15 text-sky-300',
  competition: 'bg-amber-500/15 text-amber-300',
  regulation: 'bg-red-500/15 text-red-300',
  sentiment: 'bg-cyan-500/15 text-cyan-300',
  macro: 'bg-emerald-500/15 text-emerald-300',
};

export function EnvironmentContent() {
  const overallSentiment = environmentSignals.reduce((acc, s) => acc + s.score, 0) / environmentSignals.length;

  const signalsByType = environmentSignals.reduce<Record<string, typeof environmentSignals>>((acc, s) => {
    if (!acc[s.type]) acc[s.type] = [];
    acc[s.type].push(s);
    return acc;
  }, {});

  return (
    <>
      {/* Sentiment Summary */}
      <div className="glass-card p-6 mb-6">
        <div className="grid grid-cols-4 gap-6">
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider">Overall Sentiment</span>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-2xl font-bold ${overallSentiment > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {overallSentiment > 0 ? '+' : ''}{(overallSentiment * 100).toFixed(0)}%
              </span>
              {overallSentiment > 0 ? <TrendingUp className="w-5 h-5 text-emerald-400" /> : <TrendingDown className="w-5 h-5 text-red-400" />}
            </div>
          </div>
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider">Signals Tracked</span>
            <p className="text-2xl font-bold text-white mt-2">{environmentSignals.length}</p>
          </div>
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider">Positive Signals</span>
            <p className="text-2xl font-bold text-emerald-400 mt-2">
              {environmentSignals.filter((s) => s.impact === 'positive').length}
            </p>
          </div>
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider">Risk Signals</span>
            <p className="text-2xl font-bold text-red-400 mt-2">
              {environmentSignals.filter((s) => s.impact === 'negative').length}
            </p>
          </div>
        </div>
      </div>

      {/* Signal Categories */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {Object.entries(signalsByType).map(([type, signals]) => (
          <div key={type} className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              {typeIcon[type]}
              <h3 className="text-sm font-medium text-gray-300 capitalize">{type} Signals</h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${typeColor[type]}`}>
                {signals.length}
              </span>
            </div>
            <div className="space-y-3">
              {signals.map((signal, i) => (
                <div key={i} className="flex items-start justify-between py-3 px-3 rounded-lg bg-gray-900/50 border border-gray-800/50">
                  <div className="flex items-start gap-3 flex-1">
                    {impactIcon[signal.impact]}
                    <div>
                      <p className="text-sm text-gray-300">{signal.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-gray-500">{signal.source}</span>
                        <span className="text-[10px] text-gray-600">&middot;</span>
                        <span className="text-[10px] text-gray-500">{signal.timestamp}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-gray-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${signal.score > 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.abs(signal.score) * 100}%` }}
                      />
                    </div>
                    <span className={`text-xs font-mono ${signal.score > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {signal.score > 0 ? '+' : ''}{signal.score.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Data Sources */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-medium text-gray-300 mb-4">Data Sources</h3>
        <div className="grid grid-cols-5 gap-4">
          {['News APIs', 'Social Listening', 'Market Data', 'Gov Portals', 'Review Platforms'].map((source) => (
            <div key={source} className="text-center py-3 px-4 rounded-lg bg-gray-900/50 border border-gray-800/50">
              <div className="w-2 h-2 rounded-full bg-emerald-500 mx-auto mb-2 status-pulse" />
              <span className="text-xs text-gray-400">{source}</span>
              <p className="text-[10px] text-gray-600 mt-0.5">Connected</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default function Environment() {
  return (
    <div>
      <PageHeader
        title="Environment Twin"
        subtitle="External market dynamics, competition, regulations, and sentiment"
        icon={<Globe className="w-6 h-6" />}
        badge="External"
      />
      <EnvironmentContent />
    </div>
  );
}
