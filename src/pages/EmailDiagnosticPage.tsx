import React, { useState } from 'react';
import { EmailDiagnosticTool, EmailDiagnosticResult } from '../utils/emailDiagnosticTool';

export default function EmailDiagnosticPage() {
  const [diagnosticResult, setDiagnosticResult] = useState<EmailDiagnosticResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testResult, setTestResult] = useState<string>('');

  const runDiagnostic = async () => {
    setIsRunning(true);
    try {
      const result = await EmailDiagnosticTool.runFullDiagnostic();
      setDiagnosticResult(result);
    } catch (error) {
      console.error('Diagnostic failed:', error);
      setTestResult(`Diagnostic failed: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const testEmailSending = async () => {
    if (!testEmail) {
      setTestResult('Please enter a test email address');
      return;
    }

    setIsRunning(true);
    try {
      const success = await EmailDiagnosticTool.testEmailSending(testEmail);
      setTestResult(success ? 'Test email sent successfully!' : 'Test email failed to send');
    } catch (error) {
      console.error('Test email failed:', error);
      setTestResult(`Test email failed: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const processEmailQueue = async () => {
    setIsRunning(true);
    try {
      const result = await EmailDiagnosticTool.processEmailQueue();
      setTestResult(`Email queue processed: ${result.sent} sent, ${result.failed} failed`);
    } catch (error) {
      console.error('Email queue processing failed:', error);
      setTestResult(`Email queue processing failed: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const checkFailedEmails = async () => {
    setIsRunning(true);
    try {
      await EmailDiagnosticTool.checkFailedEmails();
      setTestResult('Failed emails check completed - check console for details');
    } catch (error) {
      console.error('Failed emails check failed:', error);
      setTestResult(`Failed emails check failed: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const fixCommonIssues = async () => {
    setIsRunning(true);
    try {
      await EmailDiagnosticTool.fixCommonIssues();
      setTestResult('Common issues fix attempt completed - check console for details');
    } catch (error) {
      console.error('Fix common issues failed:', error);
      setTestResult(`Fix common issues failed: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Email System Diagnostic Tool</h1>
            
            <div className="space-y-6">
              {/* Main Diagnostic Button */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h2 className="text-lg font-semibold text-blue-900 mb-2">Full System Diagnostic</h2>
                <p className="text-blue-700 mb-4">
                  Run a comprehensive diagnostic of the email system including Gmail configuration, 
                  email templates, queue status, and recent orders.
                </p>
                <button
                  onClick={runDiagnostic}
                  disabled={isRunning}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isRunning ? 'Running Diagnostic...' : 'Run Full Diagnostic'}
                </button>
              </div>

              {/* Test Email Section */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h2 className="text-lg font-semibold text-green-900 mb-2">Test Email Sending</h2>
                <p className="text-green-700 mb-4">
                  Send a test email to verify the email system is working correctly.
                </p>
                <div className="flex gap-2 mb-4">
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="Enter test email address"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <button
                    onClick={testEmailSending}
                    disabled={isRunning || !testEmail}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    Send Test Email
                  </button>
                </div>
              </div>

              {/* Email Queue Actions */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h2 className="text-lg font-semibold text-yellow-900 mb-2">Email Queue Management</h2>
                <p className="text-yellow-700 mb-4">
                  Manage the email queue and check for failed emails.
                </p>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={processEmailQueue}
                    disabled={isRunning}
                    className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 disabled:opacity-50"
                  >
                    Process Email Queue
                  </button>
                  <button
                    onClick={checkFailedEmails}
                    disabled={isRunning}
                    className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 disabled:opacity-50"
                  >
                    Check Failed Emails
                  </button>
                  <button
                    onClick={fixCommonIssues}
                    disabled={isRunning}
                    className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50"
                  >
                    Fix Common Issues
                  </button>
                </div>
              </div>

              {/* Test Results */}
              {testResult && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Test Results</h3>
                  <p className="text-gray-700">{testResult}</p>
                </div>
              )}

              {/* Diagnostic Results */}
              {diagnosticResult && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Diagnostic Results</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-lg border">
                      <h4 className="font-semibold text-gray-900 mb-2">Gmail Configuration</h4>
                      <p className={`text-sm ${diagnosticResult.gmailConfigured ? 'text-green-600' : 'text-red-600'}`}>
                        {diagnosticResult.gmailConfigured ? '✅ Configured' : '❌ Not Configured'}
                      </p>
                      <p className={`text-sm ${diagnosticResult.gmailConnectionTest ? 'text-green-600' : 'text-red-600'}`}>
                        {diagnosticResult.gmailConnectionTest ? '✅ Connection Test Passed' : '❌ Connection Test Failed'}
                      </p>
                    </div>

                    <div className="bg-white p-4 rounded-lg border">
                      <h4 className="font-semibold text-gray-900 mb-2">Email Templates</h4>
                      <p className={`text-sm ${diagnosticResult.emailTemplatesExist ? 'text-green-600' : 'text-red-600'}`}>
                        {diagnosticResult.emailTemplatesExist ? '✅ Templates Found' : '❌ No Templates Found'}
                      </p>
                      <p className="text-sm text-gray-600">
                        {diagnosticResult.customAdTemplates.length} custom ad templates
                      </p>
                    </div>

                    <div className="bg-white p-4 rounded-lg border">
                      <h4 className="font-semibold text-gray-900 mb-2">Email Queue Status</h4>
                      <p className="text-sm text-gray-600">
                        Pending: {diagnosticResult.emailQueueStatus.pending}
                      </p>
                      <p className="text-sm text-gray-600">
                        Sent: {diagnosticResult.emailQueueStatus.sent}
                      </p>
                      <p className="text-sm text-gray-600">
                        Failed: {diagnosticResult.emailQueueStatus.failed}
                      </p>
                    </div>

                    <div className="bg-white p-4 rounded-lg border">
                      <h4 className="font-semibold text-gray-900 mb-2">Issues Found</h4>
                      <p className="text-sm text-gray-600">
                        {diagnosticResult.issues.length} issues detected
                      </p>
                    </div>
                  </div>

                  {diagnosticResult.issues.length > 0 && (
                    <div className="mb-6">
                      <h4 className="font-semibold text-red-900 mb-2">Issues:</h4>
                      <ul className="list-disc list-inside text-red-700 space-y-1">
                        {diagnosticResult.issues.map((issue, index) => (
                          <li key={index} className="text-sm">{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {diagnosticResult.recommendations.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-2">Recommendations:</h4>
                      <ul className="list-disc list-inside text-blue-700 space-y-1">
                        {diagnosticResult.recommendations.map((rec, index) => (
                          <li key={index} className="text-sm">{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
