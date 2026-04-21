import React, { useState, useEffect, useCallback, useContext } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { CurrencyCircleDollar, TrendUp, Target, ArrowDown, FilePdf, Check } from '@phosphor-icons/react';
import { BrandingContext } from '../App';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Commission = ({ user }) => {
  const { companyName } = useContext(BrandingContext);
  const [commission, setCommission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [goalInput, setGoalInput] = useState('');
  const [savingGoal, setSavingGoal] = useState(false);
  const [consultants, setConsultants] = useState([]);
  const [selectedConsultantId, setSelectedConsultantId] = useState('');

  const isAdmin = user?.role === 'admin';

  const fetchConsultants = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const cons = res.data.filter(u => u.role === 'consultant');
      setConsultants(cons);
      if (cons.length > 0) {
        setSelectedConsultantId(cons[0].id);
      } else {
        setLoading(false);
      }
      return cons;
    } catch (error) {
      toast.error('Failed to load consultants');
      setLoading(false);
      return [];
    }
  }, []);

  const fetchCommissionData = useCallback(async (consultantId) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = consultantId ? `?user_id=${consultantId}` : '';
      const res = await axios.get(`${API_URL}/api/commission${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCommission(res.data);
      setGoalInput(res.data.income_goal ? String(res.data.income_goal) : '');
    } catch (error) {
      toast.error('Failed to load commission data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchConsultants().then(cons => {
        if (cons.length > 0) fetchCommissionData(cons[0].id);
      });
    } else {
      fetchCommissionData();
    }
  }, [isAdmin, fetchConsultants, fetchCommissionData]);

  const handleConsultantChange = (id) => {
    setSelectedConsultantId(id);
    fetchCommissionData(id);
  };

  const handleSaveGoal = async () => {
    setSavingGoal(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/commission/goal`, {
        user_id: isAdmin ? selectedConsultantId : user?.id,
        goal: parseFloat(goalInput) || 0
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Income goal saved');
      fetchCommissionData(isAdmin ? selectedConsultantId : undefined);
    } catch (error) {
      toast.error('Failed to save goal');
    } finally {
      setSavingGoal(false);
    }
  };

  const getDifferenceColor = (diff, goal) => {
    if (!goal || goal === 0) return 'text-zinc-400';
    const pct = ((goal - Math.abs(diff)) / goal) * 100;
    if (diff <= 0) return 'text-emerald-400';
    if (pct >= 50) return 'text-amber-400';
    return 'text-red-400';
  };

  const getDifferenceBg = (diff, goal) => {
    if (!goal || goal === 0) return 'border-zinc-700';
    const pct = ((goal - Math.abs(diff)) / goal) * 100;
    if (diff <= 0) return 'border-emerald-500/50 bg-emerald-500/5';
    if (pct >= 50) return 'border-amber-500/50 bg-amber-500/5';
    return 'border-red-500/50 bg-red-500/5';
  };

  const exportPDF = () => {
    if (!commission) return;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const companyLabel = companyName;
    const monthLabel = commission.month_start && commission.month_end
      ? `${commission.month_start} to ${commission.month_end}`
      : 'Current Month';

    // --- Page 1: Debit Orders ---
    doc.setFontSize(10);
    doc.text(monthLabel, 14, 15);
    doc.text(companyLabel, pageWidth / 2, 15, { align: 'center' });
    doc.text(commission.consultant_name, pageWidth - 14, 15, { align: 'right' });

    doc.setFontSize(16);
    doc.text('Debit Order Commission Report', 14, 28);

    const debitRows = commission.debit_deals.map(d => [
      d.deal_date,
      d.client_name,
      d.client_number,
      d.joining_fee != null ? `R${(d.joining_fee || 0).toFixed(2)}` : '-',
      d.debit_order_value != null ? `R${(d.debit_order_value || 0).toFixed(2)}` : '-',
      d.units || 0,
      d.term || '-'
    ]);
    const debitTotals = [
      'TOTALS', '', '',
      `R${commission.total_joining_fees.toFixed(2)}`,
      `R${commission.total_debit_value.toFixed(2)}`,
      commission.total_debit_units,
      ''
    ];
    debitRows.push(debitTotals);

    autoTable(doc, {
      startY: 34,
      head: [['Date', 'Client Name', 'Client Number', 'Joining Fee', 'DO Value', 'Units', 'Term']],
      body: debitRows,
      theme: 'grid',
      headStyles: { fillColor: [132, 204, 22], textColor: [0, 0, 0], fontStyle: 'bold' },
      styles: { fontSize: 9 },
      didParseCell: (data) => {
        if (data.row.index === debitRows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 240, 240];
        }
      }
    });

    const debitFooterY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.text(
      `${commission.total_debit_units} Units x R${commission.debit_rate.toFixed(2)} = R${commission.debit_commission.toFixed(2)}`,
      pageWidth - 14, debitFooterY, { align: 'right' }
    );

    // --- Page 2: Cash Deals ---
    doc.addPage();
    doc.setFontSize(10);
    doc.text(monthLabel, 14, 15);
    doc.text(companyLabel, pageWidth / 2, 15, { align: 'center' });
    doc.text(commission.consultant_name, pageWidth - 14, 15, { align: 'right' });

    doc.setFontSize(16);
    doc.text('Cash Deals Commission Report', 14, 28);

    const cashRows = commission.cash_deals.map(d => [
      d.deal_date,
      d.client_name,
      d.client_number,
      d.sales_value != null ? `R${(d.sales_value || 0).toFixed(2)}` : '-',
      d.units || 0,
      d.term || '-'
    ]);
    const totalCashValue = commission.total_cash_value;
    const cashTotals = ['TOTALS', '', '', `R${totalCashValue.toFixed(2)}`, '', ''];
    cashRows.push(cashTotals);

    autoTable(doc, {
      startY: 34,
      head: [['Date', 'Client Name', 'Client Number', 'Cash Deal Value', 'Units', 'Term']],
      body: cashRows,
      theme: 'grid',
      headStyles: { fillColor: [132, 204, 22], textColor: [0, 0, 0], fontStyle: 'bold' },
      styles: { fontSize: 9 },
      didParseCell: (data) => {
        if (data.row.index === cashRows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [240, 240, 240];
        }
      }
    });

    const cashFooterY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(10);
    doc.text(
      `R${totalCashValue.toFixed(2)} x ${commission.cash_pct}% = R${commission.cash_commission.toFixed(2)}`,
      pageWidth - 14, cashFooterY, { align: 'right' }
    );

    doc.save(`Commission_${commission.consultant_name.replace(/\s/g, '_')}_${commission.month_start || 'current'}.pdf`);
    toast.success('PDF exported');
  };

  const difference = commission ? (commission.income_goal || 0) - commission.earnings_mtd : 0;

  return (
    <Layout user={user}>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6" data-testid="commission-page">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-zinc-50" data-testid="commission-title">
              Commission
            </h1>
            <p className="mt-2 text-base text-zinc-400">
              {commission ? `${commission.consultant_name}'s earnings` : 'Track your earnings'}
            </p>
          </div>

          <div className="flex items-end gap-3">
            {isAdmin && consultants.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">Consultant</Label>
                <Select value={selectedConsultantId} onValueChange={handleConsultantChange}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-50 w-52" data-testid="consultant-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {consultants.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs tracking-wider uppercase font-bold text-zinc-500">What's my income goal this month?</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  placeholder="R 0.00"
                  data-testid="income-goal-input"
                  className="bg-zinc-900 border-zinc-800 text-zinc-50 w-40"
                />
                <Button
                  onClick={handleSaveGoal}
                  disabled={savingGoal}
                  data-testid="save-goal-button"
                  className="bg-lime-400 text-zinc-950 font-bold hover:bg-lime-500"
                >
                  <Check size={18} weight="bold" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-zinc-400">Loading commission data...</div>
        ) : commission ? (
          <>
            {/* 3 Big Summary Boxes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              <Card className="stat-card p-6" data-testid="earnings-mtd-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs tracking-wider uppercase font-bold text-zinc-500">Earnings MTD</p>
                    <p className="mt-2 text-4xl font-black text-lime-400">R{commission.earnings_mtd.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
                    <div className="mt-3 space-y-1 text-xs text-zinc-500">
                      <p>Basic: R{(commission.basic_salary || 0).toLocaleString()}</p>
                      <p>DO Comm: R{commission.debit_commission.toLocaleString()}</p>
                      <p>Cash Comm: R{commission.cash_commission.toLocaleString()}</p>
                      <p>Bonuses: R{commission.total_bonuses.toLocaleString()}</p>
                    </div>
                  </div>
                  <TrendUp size={36} weight="duotone" className="text-lime-400" />
                </div>
              </Card>

              <Card className="stat-card p-6" data-testid="goal-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs tracking-wider uppercase font-bold text-zinc-500">My Goal</p>
                    <p className="mt-2 text-4xl font-black text-cyan-400">R{(commission.income_goal || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <Target size={36} weight="duotone" className="text-cyan-400" />
                </div>
              </Card>

              <Card className={`stat-card p-6 border ${getDifferenceBg(difference, commission.income_goal)}`} data-testid="difference-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs tracking-wider uppercase font-bold text-zinc-500">Difference</p>
                    <p className={`mt-2 text-4xl font-black ${getDifferenceColor(difference, commission.income_goal)}`}>
                      {difference <= 0 ? '+' : '-'}R{Math.abs(difference).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {difference <= 0 ? 'Goal reached!' : 'Still needed to reach goal'}
                    </p>
                  </div>
                  <ArrowDown size={36} weight="duotone" className={getDifferenceColor(difference, commission.income_goal)} />
                </div>
              </Card>
            </div>

            {/* Commission Earned Boxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <Card className="stat-card p-6" data-testid="debit-commission-card">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs tracking-wider uppercase font-bold text-zinc-500">Debit Order Commission</p>
                    <p className="mt-2 text-3xl font-black text-zinc-50">R{commission.debit_commission.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <CurrencyCircleDollar size={32} weight="duotone" className="text-amber-500" />
                </div>
                <p className="text-sm text-zinc-400">
                  {commission.total_debit_units} units x R{commission.debit_rate} per unit
                </p>
                <p className="text-xs text-zinc-500 mt-1">Total Units Sold: {commission.total_debit_units}</p>
              </Card>

              <Card className="stat-card p-6" data-testid="cash-commission-card">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs tracking-wider uppercase font-bold text-zinc-500">Cash Sales Commission</p>
                    <p className="mt-2 text-3xl font-black text-zinc-50">R{commission.cash_commission.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <CurrencyCircleDollar size={32} weight="duotone" className="text-emerald-500" />
                </div>
                <p className="text-sm text-zinc-400">
                  {commission.cash_pct}% of R{commission.total_cash_value.toLocaleString()}
                </p>
              </Card>
            </div>

            {/* Export Button */}
            <div className="flex justify-end">
              <Button
                onClick={exportPDF}
                data-testid="export-pdf-button"
                className="bg-zinc-800 text-zinc-50 hover:bg-zinc-700 flex items-center gap-2"
              >
                <FilePdf size={20} weight="bold" />
                Export to PDF
              </Button>
            </div>

            {/* Debit Order Deals Table */}
            <Card className="stat-card p-6" data-testid="debit-deals-table-card">
              <h3 className="text-lg font-bold text-zinc-100 mb-4">Debit Order Deals Sold</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-900/80 text-zinc-400 font-semibold uppercase text-xs">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Client Name</th>
                      <th className="p-3">Client Number</th>
                      <th className="p-3">Joining Fee</th>
                      <th className="p-3">DO Value</th>
                      <th className="p-3">Units</th>
                      <th className="p-3">Term</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commission.debit_deals.map((d) => (
                      <tr key={d.id} className="border-t border-zinc-800/50 hover:bg-zinc-800/30">
                        <td className="p-3 text-zinc-300">{d.deal_date}</td>
                        <td className="p-3 font-semibold text-zinc-100">{d.client_name}</td>
                        <td className="p-3 text-zinc-300">{d.client_number}</td>
                        <td className="p-3 text-zinc-300">{d.joining_fee != null ? `R${(d.joining_fee || 0).toFixed(2)}` : '-'}</td>
                        <td className="p-3 text-zinc-300">{d.debit_order_value != null ? `R${(d.debit_order_value || 0).toFixed(2)}` : '-'}</td>
                        <td className="p-3 text-zinc-300">{d.units || 0}</td>
                        <td className="p-3 text-zinc-300">{d.term || '-'}</td>
                      </tr>
                    ))}
                    {commission.debit_deals.length === 0 && (
                      <tr><td colSpan={7} className="p-6 text-center text-zinc-500">No debit order deals yet</td></tr>
                    )}
                  </tbody>
                  {commission.debit_deals.length > 0 && (
                    <tfoot className="bg-zinc-900/60 font-bold text-zinc-100">
                      <tr>
                        <td className="p-3" colSpan={3}>TOTALS</td>
                        <td className="p-3">R{commission.total_joining_fees.toFixed(2)}</td>
                        <td className="p-3">R{commission.total_debit_value.toFixed(2)}</td>
                        <td className="p-3">{commission.total_debit_units}</td>
                        <td className="p-3"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </Card>

            {/* Cash Deals Table */}
            <Card className="stat-card p-6" data-testid="cash-deals-table-card">
              <h3 className="text-lg font-bold text-zinc-100 mb-4">Cash Deals</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-900/80 text-zinc-400 font-semibold uppercase text-xs">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Client Name</th>
                      <th className="p-3">Client Number</th>
                      <th className="p-3">Cash Deal Value</th>
                      <th className="p-3">Units</th>
                      <th className="p-3">Term</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commission.cash_deals.map((d) => (
                      <tr key={d.id} className="border-t border-zinc-800/50 hover:bg-zinc-800/30">
                        <td className="p-3 text-zinc-300">{d.deal_date}</td>
                        <td className="p-3 font-semibold text-zinc-100">{d.client_name}</td>
                        <td className="p-3 text-zinc-300">{d.client_number}</td>
                        <td className="p-3 text-zinc-300">{d.sales_value != null ? `R${(d.sales_value || 0).toFixed(2)}` : '-'}</td>
                        <td className="p-3 text-zinc-300">{d.units || 0}</td>
                        <td className="p-3 text-zinc-300">{d.term || '-'}</td>
                      </tr>
                    ))}
                    {commission.cash_deals.length === 0 && (
                      <tr><td colSpan={6} className="p-6 text-center text-zinc-500">No cash deals yet</td></tr>
                    )}
                  </tbody>
                  {commission.cash_deals.length > 0 && (
                    <tfoot className="bg-zinc-900/60 font-bold text-zinc-100">
                      <tr>
                        <td className="p-3" colSpan={3}>TOTALS</td>
                        <td className="p-3">R{commission.total_cash_value.toFixed(2)}</td>
                        <td className="p-3"></td>
                        <td className="p-3"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </Card>
          </>
        ) : (
          <div className="text-center py-12 text-zinc-500">No commission data available. Ensure month period is set in Settings.</div>
        )}
      </div>
    </Layout>
  );
};

export default Commission;
