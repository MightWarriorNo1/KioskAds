import Card from './ui/Card';
import Button from './ui/Button';
import { CreditCard, Plus } from 'lucide-react';
import { PaymentMethod } from '../types/database';

interface PaymentMethodSelectorProps {
  paymentMethods: PaymentMethod[];
  selectedMethodId: string | null;
  onMethodSelect: (methodId: string | null) => void;
  onAddNewMethod: () => void | Promise<void>;
  amount: number;
  onPayWithSavedMethod?: () => void;
  isProcessing?: boolean;
}

export default function PaymentMethodSelector({
  paymentMethods,
  selectedMethodId,
  onMethodSelect,
  onAddNewMethod,
  amount,
  onPayWithSavedMethod,
  isProcessing
}: PaymentMethodSelectorProps) {

  const formatCardNumber = (last4: string | undefined) => {
    return last4 ? `**** **** **** ${last4}` : '**** **** **** ****';
  };

  const formatExpiry = (month: number | undefined, year: number | undefined) => {
    if (!month || !year) return '';
    return `${month.toString().padStart(2, '0')}/${year.toString().slice(-2)}`;
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Payment</h3>
          <span className="text-lg font-semibold">${amount}</span>
        </div>
      </div>

      {paymentMethods.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 dark:text-gray-100">
            Choose Payment Method
          </h4>
          
          <div className="space-y-3">
            {paymentMethods.map((method) => (
              <div key={method.id} className="flex items-center space-x-3">
                <input
                  type="radio"
                  id={method.id}
                  name="paymentMethod"
                  value={method.id}
                  checked={selectedMethodId === method.id}
                  onChange={() => onMethodSelect(method.id)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <label
                  htmlFor={method.id}
                  className="flex-1 cursor-pointer"
                >
                  <Card className={`p-4 transition-colors ${
                    selectedMethodId === method.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}>
                    <div className="flex items-center space-x-3">
                      <CreditCard className="w-5 h-5 text-gray-500" />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">
                            {method.brand?.toUpperCase() || 'CARD'}
                          </span>
                          {method.is_default && (
                            <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {formatCardNumber(method.last4)}
                        </div>
                        {method.expiry_month && method.expiry_year && (
                          <div className="text-xs text-gray-500 dark:text-gray-500">
                            Expires {formatExpiry(method.expiry_month, method.expiry_year)}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center space-x-3">
          <input
            type="radio"
            id="new-method"
            name="paymentMethod"
            value=""
            checked={selectedMethodId === null}
            onChange={() => onMethodSelect(null)}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
          />
          <label
            htmlFor="new-method"
            className="flex-1 cursor-pointer"
          >
            <Card className={`p-4 transition-colors ${
              selectedMethodId === null
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700'
            }`}>
              <div className="flex items-center space-x-3">
                <Plus className="w-5 h-5 text-gray-500" />
                <div>
                  <div className="font-medium">
                    {paymentMethods.length > 0 ? 'Use Different Payment Method' : 'Add Payment Method'}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Enter new card details
                  </div>
                </div>
              </div>
            </Card>
          </label>
        </div>
      </div>


      {selectedMethodId && (
        <Button
          onClick={onPayWithSavedMethod}
          disabled={!onPayWithSavedMethod || isProcessing}
          className="w-full"
          size="lg"
        >
          {isProcessing ? 'Processing...' : `Pay $${amount}`}
        </Button>
      )}

      {selectedMethodId === null && (
        <Button
          onClick={onAddNewMethod}
          className="w-full"
          size="lg"
        >
          Add Payment Method & Pay ${amount}
        </Button>
      )}
    </div>
  );
}
