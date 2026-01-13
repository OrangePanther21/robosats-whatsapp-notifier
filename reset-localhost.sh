#!/bin/bash
# Reset script for localhost development

echo "🔄 Resetting RoboSats WhatsApp Notifier to fresh state..."

# Remove config file (will trigger first-run state)
if [ -f "data/config.json" ]; then
    rm "data/config.json"
    echo "✅ Deleted config.json"
fi

# Remove offer history
if [ -f "data/seen_offers.json" ]; then
    rm "data/seen_offers.json"
    echo "✅ Deleted seen_offers.json"
fi

# Remove WhatsApp authentication data
if [ -d ".wwebjs_auth" ]; then
    rm -rf ".wwebjs_auth"
    echo "✅ Deleted .wwebjs_auth/ (WhatsApp session)"
fi

# Remove WhatsApp cache
if [ -d ".wwebjs_cache" ]; then
    rm -rf ".wwebjs_cache"
    echo "✅ Deleted .wwebjs_cache/"
fi

# Optional: Remove log file
if [ -f "app.log" ]; then
    rm "app.log"
    echo "✅ Deleted app.log"
fi

echo ""
echo "✨ Reset complete! Next steps:"
echo "1. Start the app: npm start"
echo "2. Scan the QR code to authenticate WhatsApp"
echo "3. Configure settings in the web UI"
echo "4. Click 'Start Bot' when ready"
