export const handleWebhook = async (req, res) => {
  try {
    const webhookData = req.body;
    const eventType = req.headers['x-event-type'] || 'unknown';
    
    // Log the incoming webhook data
    // console.log(`Received webhook event type: ${eventType}`, {
    //   headers: req.headers,
    //   body: webhookData
    // });

    // Here you can add specific handlers for different event types
    switch (eventType.toLowerCase()) {
      case 'lead.status.updated':
        // Handle lead status updates
        break;
      case 'merchant.created':
        // Handle new merchant creation
        break;
      case 'merchant.updated':
        // Handle merchant updates
        break;
      // Add more cases as needed
      default:
        // Generic handling for unspecified event types
        // console.log('Unhandled event type:', eventType);
    }
    
    // Send a success response back to the CRM
    res.status(200).json({
      success: true,
      message: 'Webhook received and processed successfully',
      eventType
    });
  } catch (error) {
    console.error('Error processing webhook:', error);

    res.status(500).json({
      success: false,
      message: 'Error processing webhook',
      error: error.message
    });
  }
}; 