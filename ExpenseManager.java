import java.util.ArrayList;

class Expense {
    int id;
    double amount;
    String category;
    String note;

    Expense(int id, double amount, String category, String note) {
        this.id = id;
        this.amount = amount;
        this.category = category;
        this.note = note;
    }
}

public class ExpenseManager {
    ArrayList<Expense> expenses = new ArrayList<>();

    void addExpense(double amount, String category, String note) {
        int id = (int) System.currentTimeMillis();
        expenses.add(new Expense(id, amount, category, note));
    }

    void deleteExpense(int id) {
        expenses.removeIf(e -> e.id == id);
    }

    double getTotal() {
        double sum = 0;
        for (Expense e : expenses) {
            sum += e.amount;
        }
        return sum;
    }
}