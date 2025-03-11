import { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { PLANS } from '@/lib/payment';

interface CreditPurchaseProps {
  subscriptionTier: string;
  isLoading: boolean;
  onPurchase: (amount: number) => void;
}

export default function CreditPurchase({
  subscriptionTier,
  isLoading,
  onPurchase
}: CreditPurchaseProps) {
  const { theme } = useTheme();
  const [amount, setAmount] = useState<number>(10);
  const [isCustomAmount, setIsCustomAmount] = useState<boolean>(false);
  const [customAmount, setCustomAmount] = useState<number | ''>('');

  // Only Pro and Ultra plans can purchase credits
  if (subscriptionTier.toLowerCase() === 'free') {
    return null;
  }

  const plan = subscriptionTier.toLowerCase() === 'pro' ? PLANS.PRO : PLANS.ULTRA;
  const creditsPerDollar = plan.topUpRate || 0;
  const predefinedAmounts = [10, 20, 50];

  const handleAmountSelect = (selectedAmount: number) => {
    setAmount(selectedAmount);
    setIsCustomAmount(false);
  };

  const handleCustomAmountToggle = () => {
    setIsCustomAmount(true);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      setCustomAmount('');
      return;
    }
    
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue > 0) {
      setCustomAmount(numValue);
    }
  };

  const handlePurchase = () => {
    // Convert from dollar amount to credit amount before sending to payment service
    const dollarAmount = isCustomAmount ? Number(customAmount) : amount;
    
    if (dollarAmount > 0) {
      // Calculate the equivalent credit amount based on the plan's credit rate
      const creditAmount = Math.round(dollarAmount * creditsPerDollar);
      // Pass the credit amount to the payment service
      onPurchase(creditAmount);
    }
  };

  return (
    <div className={`p-6 rounded-lg ${theme === "dark" ? "bg-gray-800" : "bg-white shadow-md"} mt-8`}>
      <h2 className="text-xl font-bold mb-4">Purchase Additional Credits</h2>
      <p className="mb-4">
        Current rate: <span className="font-bold">${1} = {creditsPerDollar} credits</span> on your {subscriptionTier} plan
      </p>
      
      {/* Amount Selector */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-3">Select Amount</h3>
        
        <div className="grid grid-cols-3 gap-3 mb-3">
          {predefinedAmounts.map((predefinedAmount) => (
            <button
              key={predefinedAmount}
              onClick={() => handleAmountSelect(predefinedAmount)}
              className={`py-2 px-4 rounded-lg font-medium ${
                !isCustomAmount && amount === predefinedAmount
                  ? theme === 'dark'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-indigo-500 text-white'
                  : theme === 'dark'
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }`}
            >
              ${predefinedAmount}
            </button>
          ))}
        </div>
        
        <div className="mb-4">
          <button
            onClick={handleCustomAmountToggle}
            className={`text-sm underline ${isCustomAmount ? 'text-indigo-500' : 'opacity-75'}`}
          >
            Enter custom amount
          </button>
          
          {isCustomAmount && (
            <div className="mt-3">
              <div className="flex items-center">
                <span className="mr-2 text-lg">$</span>
                <input
                  type="number"
                  min="1"
                  value={customAmount}
                  onChange={handleCustomAmountChange}
                  className={`w-full p-2 rounded-lg ${
                    theme === 'dark'
                      ? 'bg-gray-700 text-white border border-gray-600'
                      : 'bg-white text-gray-800 border border-gray-300'
                  }`}
                  placeholder="Enter amount"
                />
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Summary */}
      <div className={`p-4 rounded-lg mb-6 ${theme === "dark" ? "bg-gray-700" : "bg-gray-100"}`}>
        <div className="flex justify-between items-center">
          <span>Amount:</span>
          <span className="font-bold">${isCustomAmount ? customAmount || 0 : amount}</span>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span>Credits to receive:</span>
          <span className="font-bold">{(isCustomAmount ? Number(customAmount) || 0 : amount) * creditsPerDollar}</span>
        </div>
      </div>
      
      {/* Purchase Button */}
      <button
        onClick={handlePurchase}
        disabled={isLoading || (isCustomAmount && (!customAmount || customAmount <= 0))}
        className={`w-full py-3 rounded-lg font-medium ${
          isLoading
            ? theme === 'dark'
              ? 'bg-gray-700 text-gray-300 cursor-not-allowed'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            : theme === 'dark'
            ? 'bg-green-600 hover:bg-green-700 text-white'
            : 'bg-green-500 hover:bg-green-600 text-white'
        }`}
      >
        {isLoading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </span>
        ) : (
          `Purchase Credits`
        )}
      </button>
    </div>
  );
} 