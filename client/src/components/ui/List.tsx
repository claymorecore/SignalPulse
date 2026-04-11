type ListProps = {
  items: string[];
};

export default function List({ items }: ListProps) {
  return (
    <ul className="content-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}


