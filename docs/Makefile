MAIN := manual-quni
BUILD := build
LATEXMK := latexmk

.PHONY: all clean

all: $(BUILD)/$(MAIN).pdf

$(BUILD)/$(MAIN).pdf: $(MAIN).tex references.bib latexmkrc
	@mkdir -p $(BUILD)
	$(LATEXMK) -pdf -interaction=nonstopmode -halt-on-error -file-line-error -outdir=$(BUILD) $(MAIN).tex

clean:
	$(LATEXMK) -C -outdir=$(BUILD) $(MAIN).tex
	@rm -rf $(BUILD)
