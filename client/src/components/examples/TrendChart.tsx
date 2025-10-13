import { TrendChart } from '../TrendChart';

export default function TrendChartExample() {
  const mockData = [
    { date: 'Mon', score: 72, meetings: 3 },
    { date: 'Tue', score: 68, meetings: 4 },
    { date: 'Wed', score: 75, meetings: 5 },
    { date: 'Thu', score: 82, meetings: 3 },
    { date: 'Fri', score: 78, meetings: 4 },
    { date: 'Sat', score: 0, meetings: 0 },
    { date: 'Sun', score: 0, meetings: 0 },
  ];

  return <TrendChart data={mockData} />;
}
