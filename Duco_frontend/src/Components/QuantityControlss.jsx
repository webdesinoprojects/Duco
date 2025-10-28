const QuantityControlss = ({ quantity, onIncrease, onDecrease }) => {
  return (
    <div className="flex items-center gap-2 border px-1  rounded-md bg-gray-700 text-white">
      <button
        onClick={onDecrease}
        className="text-sm px-2 hover:text-red-500"
      >
        −
      </button>
      <span className="font-semibold">{quantity}</span>
      <button
        onClick={onIncrease}
        className="text-sm px-2 hover:text-green-400"
      >
        +
      </button>
    </div>
  );
};

export default QuantityControlss;
