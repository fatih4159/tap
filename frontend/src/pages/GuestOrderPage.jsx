import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { menuApi } from '../services/api';
import { joinTable, callWaiter } from '../services/socket';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Bell,
  Check,
  X,
  Loader2,
  ChevronUp,
  ChevronDown,
  Image,
  AlertCircle,
} from 'lucide-react';
import clsx from 'clsx';

export default function GuestOrderPage() {
  const { token } = useParams();
  const [menu, setMenu] = useState([]);
  const [tenantInfo, setTenantInfo] = useState(null);
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    loadMenu();
  }, [token]);

  const loadMenu = async () => {
    setIsLoading(true);
    try {
      // In production, validate token and get menu
      const response = await menuApi.getPublic();
      setMenu(response.menu || []);
      setTenantInfo(response.tenant);
      setSelectedCategory(response.menu?.[0]?.id);
    } catch (error) {
      setError('Failed to load menu. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const addToCart = (item) => {
    const existing = cart.find((i) => i.id === item.id);
    if (existing) {
      setCart(
        cart.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      );
    } else {
      setCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  const updateQuantity = (itemId, delta) => {
    setCart(
      cart
        .map((i) =>
          i.id === itemId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i
        )
        .filter((i) => i.quantity > 0)
    );
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter((i) => i.id !== itemId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCallWaiter = () => {
    callWaiter({
      tableId: token,
      tableNumber: 'Guest',
      reason: 'assistance',
    });
    alert('A waiter has been notified and will assist you shortly.');
  };

  const handleSubmitOrder = () => {
    // TODO: Submit order to API
    console.log('Submitting order:', cart);
    setOrderSubmitted(true);
    setCart([]);
    setIsCartOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-4">
        <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
        <p className="text-surface-300 text-center">{error}</p>
        <button onClick={loadMenu} className="btn-primary mt-4">
          Try Again
        </button>
      </div>
    );
  }

  if (orderSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
          <Check className="w-10 h-10 text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-surface-100 mb-2">Order Submitted!</h2>
        <p className="text-surface-400 text-center mb-6">
          Your order has been sent to the kitchen.
          <br />
          We&apos;ll notify you when it&apos;s ready.
        </p>
        <button
          onClick={() => setOrderSubmitted(false)}
          className="btn-primary"
        >
          Order More
        </button>
      </div>
    );
  }

  return (
    <div className="pb-32">
      {/* Restaurant header */}
      {tenantInfo && (
        <div className="bg-surface-900 p-4 border-b border-surface-800">
          <h1 className="text-xl font-bold text-surface-100">{tenantInfo.name}</h1>
          <p className="text-surface-400 text-sm">Digital Menu</p>
        </div>
      )}

      {/* Category tabs */}
      <div className="sticky top-0 z-20 bg-surface-950 border-b border-surface-800 px-4 py-2">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {menu.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={clsx(
                'btn-sm whitespace-nowrap',
                selectedCategory === category.id ? 'btn-primary' : 'btn-secondary'
              )}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menu items */}
      <div className="p-4 space-y-6">
        {menu
          .filter((cat) => !selectedCategory || cat.id === selectedCategory)
          .map((category) => (
            <div key={category.id}>
              <h2 className="text-lg font-semibold text-surface-100 mb-4">
                {category.name}
              </h2>
              <div className="space-y-3">
                {category.items?.map((item) => (
                  <div
                    key={item.id}
                    className={clsx(
                      'card flex gap-4',
                      !item.isAvailable && 'opacity-50'
                    )}
                  >
                    {/* Image */}
                    <div className="w-24 h-24 rounded-xl bg-surface-800 flex-shrink-0 overflow-hidden">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Image className="w-8 h-8 text-surface-600" />
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium text-surface-100">{item.name}</h3>
                        <p className="font-bold text-primary-400">
                          €{item.price.toFixed(2)}
                        </p>
                      </div>
                      {item.description && (
                        <p className="text-sm text-surface-400 truncate-2 mt-1">
                          {item.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex gap-1">
                          {item.dietaryInfo?.includes('vegetarian') && (
                            <span className="badge-success text-xs">V</span>
                          )}
                          {item.dietaryInfo?.includes('vegan') && (
                            <span className="badge-success text-xs">VG</span>
                          )}
                          {!item.isAvailable && (
                            <span className="badge-danger text-xs">Sold Out</span>
                          )}
                        </div>
                        {item.isAvailable && (
                          <button
                            onClick={() => addToCart(item)}
                            className="btn-sm btn-primary"
                          >
                            <Plus className="w-4 h-4" />
                            Add
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>

      {/* Call waiter button */}
      <button
        onClick={handleCallWaiter}
        className="fixed left-4 bottom-24 btn-secondary shadow-lg"
      >
        <Bell className="w-4 h-4" />
        Call Waiter
      </button>

      {/* Cart button/drawer */}
      <div
        className={clsx(
          'fixed bottom-0 left-0 right-0 bg-surface-900 border-t border-surface-800',
          'transition-transform duration-300 safe-bottom',
          isCartOpen ? 'translate-y-0' : 'translate-y-[calc(100%-5rem)]'
        )}
        style={{ maxHeight: '70vh' }}
      >
        {/* Cart header */}
        <button
          onClick={() => setIsCartOpen(!isCartOpen)}
          className="w-full flex items-center justify-between p-4 touch-target"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <ShoppingCart className="w-6 h-6 text-surface-100" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 bg-primary-500 rounded-full text-xs font-bold flex items-center justify-center text-white">
                  {cartCount}
                </span>
              )}
            </div>
            <span className="font-medium text-surface-100">
              {cartCount === 0 ? 'Your cart is empty' : `${cartCount} items`}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-bold text-primary-400">€{cartTotal.toFixed(2)}</span>
            {isCartOpen ? (
              <ChevronDown className="w-5 h-5 text-surface-400" />
            ) : (
              <ChevronUp className="w-5 h-5 text-surface-400" />
            )}
          </div>
        </button>

        {/* Cart items */}
        {isCartOpen && (
          <div className="px-4 pb-4 overflow-y-auto" style={{ maxHeight: 'calc(70vh - 5rem)' }}>
            {cart.length === 0 ? (
              <p className="text-surface-500 text-center py-8">Add items to your cart</p>
            ) : (
              <>
                <div className="space-y-3 mb-4">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-3 border-b border-surface-800"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-surface-100 truncate">
                          {item.name}
                        </p>
                        <p className="text-sm text-surface-400">
                          €{item.price.toFixed(2)} each
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="btn-icon btn-sm btn-secondary"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-6 text-center font-medium text-surface-100">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="btn-icon btn-sm btn-secondary"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="btn-icon btn-sm btn-ghost text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleSubmitOrder}
                  className="btn-primary w-full btn-lg"
                >
                  <Check className="w-5 h-5" />
                  Place Order - €{cartTotal.toFixed(2)}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
